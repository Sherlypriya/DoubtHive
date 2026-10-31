/**
 * DoubtHive — Department & Semester Student Access Control Test Suite
 */

const http = require('http');

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
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
  console.log('\n🐝 Testing Student Department & Semester Access Controls...\n');

  // 1. Health check
  const health = await request('GET', '/health');
  assert('Server is online and healthy', health.status === 200 && health.body.database === 'connected');

  // 2. Login as student (Computer Science, Semester 4)
  const studentLogin = await request('POST', '/auth/login', {
    email: 'student@demo.com',
    password: 'demo1234',
  });
  assert('Student logged in successfully (200)', studentLogin.status === 200);
  const studentToken = studentLogin.body.token;
  const student = studentLogin.body.user;
  assert('Student has Computer Science department', student.department === 'Computer Science');
  assert('Student has Semester 4', student.semester === 4);

  // 3. Register a mechanical engineering student to test cross-department isolation
  const mechEmail = `mech_student_${Date.now()}@college.edu`;
  const mechRegister = await request('POST', '/auth/register', {
    name: 'Rohan Verma',
    email: mechEmail,
    password: 'password123',
    role: 'student',
    department: 'Mechanical Engineering',
    semester: 3,
  });
  assert('Mechanical student registered successfully (201)', mechRegister.status === 201);
  const mechToken = mechRegister.body.token;

  // 4. CS Student queries questions feed — must ONLY see Computer Science questions
  const csFeed = await request('GET', '/questions', null, studentToken);
  assert('CS Student feed returns HTTP 200', csFeed.status === 200);
  const csQuestions = csFeed.body.questions || [];
  assert('CS Student feed has questions', csQuestions.length > 0);
  const allCs = csQuestions.every((q) => q.department === 'Computer Science');
  assert('All questions returned to CS student belong strictly to Computer Science', allCs);

  // 5. CS Student attempts to bypass by explicitly querying ?department=Information+Technology
  const bypassAttempt = await request('GET', '/questions?department=Information+Technology', null, studentToken);
  assert('Query with foreign department param returns 200 but enforces student department', bypassAttempt.status === 200);
  const bypassQuestions = bypassAttempt.body.questions || [];
  const bypassAllCs = bypassQuestions.every((q) => q.department === 'Computer Science');
  assert('Foreign department query overridden: questions still strictly Computer Science', bypassAllCs);

  // 6. Find an IT question to test single question access control
  const unauthFeed = await request('GET', '/questions?department=Information+Technology');
  const itQuestions = unauthFeed.body.questions || [];
  if (itQuestions.length > 0) {
    const itQuestion = itQuestions[0];
    
    // 7. CS Student attempts to view the IT question directly via ID — must return HTTP 403
    const directAccess = await request('GET', `/questions/${itQuestion._id}`, null, studentToken);
    assert('CS Student blocked from accessing IT question via /:id (HTTP 403)', directAccess.status === 403);
    assert('403 message explains department restriction', directAccess.body.restricted === true);

    // 8. CS Student attempts to post an answer to the IT question — must return HTTP 403
    const answerAttempt = await request('POST', '/answers', {
      questionId: itQuestion._id,
      content: 'This is an unauthorized cross-department answer attempt.',
    }, studentToken);
    assert('CS Student blocked from answering IT question (HTTP 403)', answerAttempt.status === 403);
  }

  // 9. Mechanical student feed — should not see CS or IT questions
  const mechFeed = await request('GET', '/questions', null, mechToken);
  assert('Mechanical student feed returns HTTP 200', mechFeed.status === 200);
  const mechQuestions = mechFeed.body.questions || [];
  const allMech = mechQuestions.every((q) => q.department === 'Mechanical Engineering');
  assert('All questions for Mechanical student belong strictly to Mechanical Engineering', allMech);

  // 10. Student posts a new question — department and semester automatically locked
  const newDoubt = await request('POST', '/questions', {
    title: 'How does virtual memory paging work in 64-bit architectures?',
    description: 'Looking for a step-by-step breakdown of multilevel page tables.',
    subject: 'Operating Systems',
    department: 'Civil Engineering', // Student tries to specify Civil Engineering
    semester: 8,                      // Student tries to specify Semester 8
  }, studentToken);

  assert('Student doubt created (201)', newDoubt.status === 201);
  assert('Doubt department locked to student profile (Computer Science)', newDoubt.body.question.department === 'Computer Science');
  assert('Doubt semester locked to student profile (Semester 4)', newDoubt.body.question.semester === 4);

  // 11. Admin login to verify admin has global access across all departments
  const adminLogin = await request('POST', '/auth/login', {
    email: 'admin@demo.com',
    password: 'demo1234',
  });
  const adminToken = adminLogin.body.token;
  const adminFeed = await request('GET', '/questions', null, adminToken);
  assert('Admin can view all departments questions', adminFeed.status === 200);

  console.log('\n──────────────────────────────────────────────────');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('🎉 ALL DEPARTMENT ACCESS TESTS PASSED!\n');
    process.exit(0);
  } else {
    console.error(`💥 ${failed} test(s) failed.\n`);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Test runner failure:', err);
  process.exit(1);
});
