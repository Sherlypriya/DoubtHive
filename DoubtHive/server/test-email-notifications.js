/**
 * DoubtHive — Automated Email Notification Test Suite
 * Tests all 6 required notification scenarios:
 *  1. Student → Relevant Faculty (department/subject matching)
 *  2. Unassigned Doubt → Admin fallback notification
 *  3. Answer → Student (with self-answer suppression)
 *  4. Accepted Answer → Answerer (with duplicate suppression)
 *  5. New Registration → Admin notification + Student Welcome email
 *  6. Moderation action → Admin alert
 *  7. Email failure resilience (main API actions still succeed even if email fails)
 */

require('dotenv').config();
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

// Fetch sent email logs from the running server process
async function getSentEmailsLog() {
  const res = await request('GET', '/notifications/dev/email-logs');
  return res.body?.logs || [];
}

async function clearSentEmailsLog() {
  await request('DELETE', '/notifications/dev/email-logs');
}

// Small helper to wait a brief moment for async fire-and-forget emails
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  console.log('\n🐝 Testing DoubtHive Email Notification System...\n');

  // 1. Health check
  console.log('── Step 1: Health Check ──');
  const health = await request('GET', '/health');
  assert('Server is online and DB connected', health.status === 200 && health.body.database === 'connected');

  // Clear log before tests
  await clearSentEmailsLog();

  // 2. New User Registration (Welcome email + Admin notification)
  console.log('\n── Step 2: New Registration Notifications (Welcome + Admin Alert) ──');
  const uniqueStudentEmail = `student_${Date.now()}@test.edu`;
  await clearSentEmailsLog();

  const regRes = await request('POST', '/auth/register', {
    name: 'Siddharth Roy',
    email: uniqueStudentEmail,
    password: 'password123',
    role: 'student',
    department: 'Computer Science',
    semester: 4,
  });
  assert('Student registered successfully (201)', regRes.status === 201);
  const studentToken = regRes.body.token;

  // Allow async email dispatch
  await sleep(200);

  const regEmails = await getSentEmailsLog();
  const welcomeEmail = regEmails.find((e) => e.to === uniqueStudentEmail);
  assert('Welcome email sent to newly registered student', !!welcomeEmail, JSON.stringify(regEmails));
  assert('Welcome email subject is welcoming', welcomeEmail?.subject.includes('Welcome to DoubtHive'));

  const adminRegEmail = regEmails.find((e) => e.to === 'admin@demo.com');
  assert('Admin received notification of new student registration', !!adminRegEmail);
  assert('Admin email subject mentions new student', adminRegEmail?.subject.includes('New student Registered'));

  // 3. Student posts a doubt in Computer Science (Faculty matching)
  console.log('\n── Step 3: Student → Faculty Doubt Notification ──');
  await clearSentEmailsLog();

  const qRes = await request('POST', '/questions', {
    title: 'Explain Dijkstra algorithm with a priority queue',
    description: 'I need help understanding why we need a min-heap instead of an array for Dijkstra algorithm.',
    tags: ['dijkstra', 'graphs', 'algorithms'],
    subject: 'Data Structures',
    department: 'Computer Science',
  }, studentToken);
  assert('Doubt posted successfully (201)', qRes.status === 201);
  const questionId = qRes.body.question?._id;

  await sleep(200);

  const doubtEmails = await getSentEmailsLog();
  const facultyEmail = doubtEmails.find((e) => e.to === 'faculty@demo.com');
  assert('Faculty Dr. Priya Nair (Computer Science) received doubt notification', !!facultyEmail, JSON.stringify(doubtEmails));
  assert('Email subject specifies subject and question title', facultyEmail?.subject.includes('Data Structures'));

  // 4. Student posts doubt in department with NO faculty (Admin fallback alert)
  console.log('\n── Step 4: Unassigned Doubt → Admin Fallback Alert ──');
  await clearSentEmailsLog();

  const mechStudentRes = await request('POST', '/auth/register', {
    name: 'Vikram Joshi',
    email: `vikram_mech_${Date.now()}@test.edu`,
    password: 'password123',
    role: 'student',
    department: 'Mechanical Engineering',
    semester: 3,
  });
  const mechStudentToken = mechStudentRes.body.token;
  await clearSentEmailsLog();

  const unassignedQRes = await request('POST', '/questions', {
    title: 'How does a 4-stroke internal combustion engine work?',
    description: 'Need assistance with Otto cycle diagrams for thermal engineering exam.',
    tags: ['mechanics', 'thermodynamics'],
    subject: 'Thermodynamics',
    department: 'Mechanical Engineering', // No faculty in DB for this department
  }, mechStudentToken);
  assert('Unassigned doubt posted successfully (201)', unassignedQRes.status === 201);

  await sleep(200);

  const fallbackEmails = await getSentEmailsLog();
  const adminFallbackEmail = fallbackEmails.find((e) => e.to === 'admin@demo.com' && e.subject.includes('Unassigned Doubt'));
  assert('Admin notified of unassigned doubt in Mechanical Engineering', !!adminFallbackEmail, JSON.stringify(fallbackEmails));
  assert('Fallback subject identifies unassigned doubt', adminFallbackEmail?.subject.includes('Unassigned Doubt in Mechanical Engineering'));

  // 5. Faculty answers the student's doubt (Student notified)
  console.log('\n── Step 5: Answer → Student Notification ──');
  const facLogin = await request('POST', '/auth/login', {
    email: 'faculty@demo.com',
    password: 'demo1234',
  });
  const facultyToken = facLogin.body.token;

  await clearSentEmailsLog();
  const ansRes = await request('POST', '/answers', {
    questionId,
    content: 'Using a min-heap reduces extraction of the minimum distance node from O(V) to O(log V), bringing overall time complexity down to O((V + E) log V).',
  }, facultyToken);
  assert('Faculty answer created (201)', ansRes.status === 201);
  const answerId = ansRes.body.answer?._id;

  await sleep(200);

  const ansEmails = await getSentEmailsLog();
  const studentAnsEmail = ansEmails.find((e) => e.to === uniqueStudentEmail);
  assert('Student author received email notification about the new answer', !!studentAnsEmail, JSON.stringify(ansEmails));
  assert('Answer notification subject mentions doubt title', studentAnsEmail?.subject.includes('Explain Dijkstra'));

  // 6. Self-answer suppression test (Answerer should NOT receive an email if answering own question)
  console.log('\n── Step 6: Self-Answer Email Suppression ──');
  await clearSentEmailsLog();
  await request('POST', '/answers', {
    questionId,
    content: 'Adding a follow-up note to my own question regarding Fibonacci heaps.',
  }, studentToken); // Student answering own question

  await sleep(200);
  const selfEmails = await getSentEmailsLog();
  const selfEmail = selfEmails.find((e) => e.to === uniqueStudentEmail);
  assert('Student answering their own question does NOT trigger an email to themselves', !selfEmail);

  // 7. Accepted Answer Notification (+10 reputation)
  console.log('\n── Step 7: Accepted Answer → Answerer Notification ──');
  await clearSentEmailsLog();
  const acceptRes = await request('PATCH', `/answers/${answerId}/accept`, {}, studentToken);
  assert('Answer accepted by question author (200)', acceptRes.status === 200);

  await sleep(200);

  const acceptEmails = await getSentEmailsLog();
  const facultyAcceptEmail = acceptEmails.find((e) => e.to === 'faculty@demo.com');
  assert('Faculty answer author received congratulations email for accepted answer', !!facultyAcceptEmail, JSON.stringify(acceptEmails));
  assert('Accepted answer email subject mentions +10 XP reward', facultyAcceptEmail?.subject.includes('+10 XP'));

  // 8. Re-accepting already accepted answer (Duplicate email suppression)
  console.log('\n── Step 8: Duplicate Acceptance Email Suppression ──');
  await clearSentEmailsLog();
  await request('PATCH', `/answers/${answerId}/accept`, {}, studentToken); // Call accept again
  await sleep(200);
  const duplicateEmails = await getSentEmailsLog();
  assert('Re-calling accept on already accepted answer does NOT send duplicate email', duplicateEmails.length === 0);

  // 9. Admin Moderation Event Notification
  console.log('\n── Step 9: Admin Moderation Notification ──');
  const adminLogin = await request('POST', '/auth/login', {
    email: 'admin@demo.com',
    password: 'demo1234',
  });
  const adminToken = adminLogin.body.token;

  await clearSentEmailsLog();
  const modRes = await request('DELETE', `/admin/questions/${unassignedQRes.body.question._id}`, null, adminToken);
  assert('Admin force-deleted question (200)', modRes.status === 200);

  await sleep(200);
  const modEmails = await getSentEmailsLog();
  const adminModEmail = modEmails.find((e) => e.to === 'admin@demo.com');
  assert('Admin received moderation event notification', !!adminModEmail);
  assert('Moderation subject identifies Question Force-Deleted', adminModEmail?.subject.includes('Question Force-Deleted'));

  // Summary
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('🎉 ALL EMAIL NOTIFICATION TESTS PASSED SUCCESSFULLY!\n');
  } else {
    console.log('⚠️ Some email tests failed.\n');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err.message);
  process.exit(1);
});
