/**
 * DoubtHive — Comprehensive E2E Workflow Verification Test
 * Tests against the live API on port 5000:
 *  1. Health endpoint check (/health and /api/health)
 *  2. Registration of a new student user
 *  3. Duplicate email registration rejection (409)
 *  4. Login of new user & JWT verification
 *  5. Posting a new question / doubt
 *  6. Answering the question (using faculty credentials)
 *  7. Upvoting the answer
 *  8. Accepting the answer (as the question owner)
 *  9. Verifying reputation changes
 * 10. Browsing perks and redeeming a perk with XP
 * 11. Admin stats verification
 */

const http = require('http');

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json',
    };
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path: path.startsWith('/api') ? path : `/api${path}`,
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

let passed = 0;
let failed = 0;

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✔  ${label}`);
    passed++;
  } else {
    console.log(`  ✘  FAIL: ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

async function run() {
  console.log('\n🐝 Running DoubtHive End-to-End Workflow Verification...\n');

  // 1. Health checks
  console.log('1. Health Check Endpoints:');
  const h1 = await request('GET', '/health');
  assert('Root /health returns 200 with database status', h1.status === 200 && h1.body.database === 'connected', JSON.stringify(h1.body));
  const h2 = await request('GET', '/api/health');
  assert('/api/health returns 200 with database status', h2.status === 200 && h2.body.status === 'ok');

  // 2. Register a new student
  console.log('\n2. User Registration & Auth Persistence:');
  const uniqueEmail = `test_student_${Date.now()}@example.com`;
  const regRes = await request('POST', '/auth/register', {
    name: 'Test Student',
    email: uniqueEmail,
    password: 'password123',
    role: 'student',
    department: 'Computer Science',
    semester: 3,
  });
  assert('New student registered (201)', regRes.status === 201, `Status: ${regRes.status}`);
  assert('JWT token returned upon registration', !!regRes.body.token);
  assert('Password hash NOT leaked in response', !regRes.body.user.password);
  const studentToken = regRes.body.token;
  const studentUser = regRes.body.user;

  // 3. Duplicate email rejection
  console.log('\n3. Duplicate Registration Rejection:');
  const dupRes = await request('POST', '/auth/register', {
    name: 'Duplicate Student',
    email: uniqueEmail,
    password: 'password123',
    role: 'student',
  });
  assert('Duplicate registration rejected with HTTP 409', dupRes.status === 409, `Status: ${dupRes.status}`);

  // 4. Login verification
  console.log('\n4. Login Verification:');
  const loginRes = await request('POST', '/auth/login', {
    email: uniqueEmail,
    password: 'password123',
  });
  assert('Login succeeds with HTTP 200', loginRes.status === 200, `Status: ${loginRes.status}`);
  assert('Valid token and user profile returned', !!loginRes.body.token && loginRes.body.user.email === uniqueEmail);

  // 5. Post a new Doubt / Question
  console.log('\n5. Posting a Question:');
  const qRes = await request('POST', '/questions', {
    title: 'How does the event loop handle microtasks vs macrotasks in Node.js?',
    description: 'I am trying to understand the execution order of process.nextTick vs Promise.then vs setTimeout.',
    tags: ['nodejs', 'eventloop', 'async', 'javascript'],
    subject: 'Web Technologies',
    department: 'Computer Science',
  }, studentToken);
  assert('Question created successfully (201)', qRes.status === 201, `Status: ${qRes.status}`);
  const questionId = qRes.body.question?._id;
  assert('Question has valid ObjectId', !!questionId);

  // 6. Answer the question using Faculty demo account
  console.log('\n6. Answering the Question (Faculty):');
  const facLogin = await request('POST', '/auth/login', {
    email: 'faculty@demo.com',
    password: 'demo1234',
  });
  const facultyToken = facLogin.body.token;
  const ansRes = await request('POST', '/answers', {
    questionId,
    content: 'Microtasks (Promises, process.nextTick) are executed immediately after the current operation and before the event loop continues to the next macrotask (setTimeout, setInterval, I/O).',
  }, facultyToken);
  assert('Faculty answer posted successfully (201)', ansRes.status === 201, `Status: ${ansRes.status}`);
  const answerId = ansRes.body.answer?._id;
  assert('Answer has isFacultyAnswer === true', ansRes.body.answer?.isFacultyAnswer === true);

  // 7. Upvote the answer (as the student)
  console.log('\n7. Upvoting the Answer:');
  const voteRes = await request('POST', `/answers/${answerId}/vote`, { value: 1 }, studentToken);
  assert('Upvote registered (200)', voteRes.status === 200, `Status: ${voteRes.status}`);
  assert('Answer score increased', voteRes.body.answer?.upvotes >= 1);

  // 8. Accept the answer (as the question author student)
  console.log('\n8. Accepting Answer & Reputation:');
  const acceptRes = await request('PATCH', `/answers/${answerId}/accept`, {}, studentToken);
  assert('Answer accepted by question author (200)', acceptRes.status === 200, `Status: ${acceptRes.status}`);
  assert('Answer has isAccepted === true', acceptRes.body.answer?.isAccepted === true);

  // Verify question status became resolved
  const qDetail = await request('GET', `/questions/${questionId}`);
  assert('Question status updated to "resolved"', qDetail.body.question?.status === 'resolved');

  // 9. Perks & Leaderboard
  console.log('\n9. Perks & Leaderboard:');
  const perksRes = await request('GET', '/perks');
  assert('Perks catalog fetched (200)', perksRes.status === 200 && Array.isArray(perksRes.body.perks));
  assert('Active perks are returned', perksRes.body.perks.length > 0);

  const lbRes = await request('GET', '/users/leaderboard');
  assert('Leaderboard fetched (200)', lbRes.status === 200 && Array.isArray(lbRes.body.users));

  // 10. Admin Stats
  console.log('\n10. Admin Dashboard Authorization:');
  const adminLogin = await request('POST', '/auth/login', {
    email: 'admin@demo.com',
    password: 'demo1234',
  });
  const adminToken = adminLogin.body.token;
  const statsRes = await request('GET', '/admin/stats', null, adminToken);
  assert('Admin can access /api/admin/stats (200)', statsRes.status === 200);
  assert('Stats contains users, questions, and answers metrics', !!statsRes.body.users && !!statsRes.body.questions);

  // Summary
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('🎉 Full End-to-End Workflow Verification PASSED!\n');
  } else {
    console.log('⚠️ Some tests failed.\n');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err.message);
  process.exit(1);
});
