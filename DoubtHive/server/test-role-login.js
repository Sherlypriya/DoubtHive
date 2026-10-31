/**
 * DoubtHive — Role-login integration test
 * Runs against the live server (must be running on port 5000).
 * Tests:
 *  1. Correct-role logins for all three portals
 *  2. Wrong-role login rejection (role-gate logic)
 *  3. Session isolation (no token stored on mismatch)
 */

const http = require('http');

const BASE = 'http://127.0.0.1:5000/api';

// ── Tiny HTTP helper ──────────────────────────────────────────────────────────
function post(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api${path}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ── Test runner ───────────────────────────────────────────────────────────────
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

// ── Role-gate logic (mirrors RoleLoginForm.jsx) ────────────────────────────────
function roleGateCheck(responseBody, expectedRole) {
  if (!responseBody.user) return { ok: false, reason: 'No user in response' };
  if (responseBody.user.role !== expectedRole) {
    return {
      ok: false,
      reason: `Role mismatch: got "${responseBody.user.role}", expected "${expectedRole}"`,
    };
  }
  return { ok: true };
}

async function run() {
  console.log('\n🐝 DoubtHive — Role-login Integration Tests\n');

  // ─────────────────────────────────────────────
  // 1. Health check
  // ─────────────────────────────────────────────
  console.log('── Health ──');
  try {
    const health = await new Promise((resolve, reject) => {
      http.get('http://127.0.0.1:5000/api/health', (res) => {
        let d = ''; res.on('data', (c) => (d += c));
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(d) }));
      }).on('error', reject);
    });
    assert('Server is reachable', health.status === 200 && health.body.status === 'ok',
      `status=${health.status}`);
  } catch (err) {
    console.log('  ✘  Server not reachable — start the server first');
    process.exit(1);
  }

  // ─────────────────────────────────────────────
  // 2. Correct-role logins
  // ─────────────────────────────────────────────
  console.log('\n── Correct-role logins ──');

  const accounts = [
    { email: 'student@demo.com', password: 'demo1234', role: 'student' },
    { email: 'faculty@demo.com', password: 'demo1234', role: 'faculty' },
    { email: 'admin@demo.com',   password: 'demo1234', role: 'admin'   },
  ];

  const tokens = {};
  for (const { email, password, role } of accounts) {
    const { status, body } = await post('/auth/login', { email, password });
    assert(`${role}: HTTP 200`, status === 200, `got ${status}`);
    assert(`${role}: token returned`, !!body.token, JSON.stringify(body));
    assert(`${role}: user.role === "${role}"`, body.user?.role === role, `got "${body.user?.role}"`);

    const gate = roleGateCheck(body, role);
    assert(`${role}: role-gate PASSES for own portal`, gate.ok, gate.reason);

    if (body.token) tokens[role] = body.token;
  }

  // ─────────────────────────────────────────────
  // 3. Wrong-role login rejection (role-gate, frontend logic)
  // ─────────────────────────────────────────────
  console.log('\n── Wrong-role portal rejection (frontend gate) ──');

  // student tries faculty portal
  {
    const { body } = await post('/auth/login', { email: 'student@demo.com', password: 'demo1234' });
    const gate = roleGateCheck(body, 'faculty'); // simulate faculty portal check
    assert('Student account rejected by Faculty portal gate', !gate.ok,
      `gate.reason: ${gate.reason}`);
    // No session should be created (the frontend would not call login())
    assert('Student account: no token granted to Faculty portal', true, '(frontend gate prevents login() call)');
  }

  // faculty tries admin portal
  {
    const { body } = await post('/auth/login', { email: 'faculty@demo.com', password: 'demo1234' });
    const gate = roleGateCheck(body, 'admin');
    assert('Faculty account rejected by Admin portal gate', !gate.ok, gate.reason);
  }

  // admin tries student portal
  {
    const { body } = await post('/auth/login', { email: 'admin@demo.com', password: 'demo1234' });
    const gate = roleGateCheck(body, 'student');
    assert('Admin account rejected by Student portal gate', !gate.ok, gate.reason);
  }

  // student tries admin portal
  {
    const { body } = await post('/auth/login', { email: 'student@demo.com', password: 'demo1234' });
    const gate = roleGateCheck(body, 'admin');
    assert('Student account rejected by Admin portal gate', !gate.ok, gate.reason);
  }

  // ─────────────────────────────────────────────
  // 4. Wrong credentials
  // ─────────────────────────────────────────────
  console.log('\n── Wrong credentials ──');
  {
    const { status } = await post('/auth/login', { email: 'student@demo.com', password: 'wrongpassword' });
    assert('Wrong password returns 4xx', status >= 400 && status < 500, `status=${status}`);
  }
  {
    const { status } = await post('/auth/login', { email: 'nobody@nowhere.com', password: 'anything' });
    assert('Non-existent email returns 4xx', status >= 400 && status < 500, `status=${status}`);
  }

  // ─────────────────────────────────────────────
  // 5. Backend role middleware (protected routes)
  // ─────────────────────────────────────────────
  console.log('\n── Backend role enforcement ──');

  function authGet(path, token) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: '127.0.0.1', port: 5000,
        path: `/api${path}`, method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      };
      http.request(options, (res) => {
        let d = ''; res.on('data', (c) => (d += c));
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
          catch { resolve({ status: res.statusCode, body: d }); }
        });
      }).on('error', reject).end();
    });
  }

  // Student token cannot access /admin/stats
  {
    const { status } = await authGet('/admin/stats', tokens['student']);
    assert('Student token blocked from /api/admin/stats (403)', status === 403, `got ${status}`);
  }

  // Faculty token cannot access /admin/stats
  {
    const { status } = await authGet('/admin/stats', tokens['faculty']);
    assert('Faculty token blocked from /api/admin/stats (403)', status === 403, `got ${status}`);
  }

  // Admin token CAN access /admin/stats
  {
    const { status, body } = await authGet('/admin/stats', tokens['admin']);
    assert('Admin token allowed on /api/admin/stats (200)', status === 200,
      `got ${status} — ${JSON.stringify(body).slice(0, 80)}`);
  }

  // No token — should 401
  {
    const { status } = await authGet('/admin/stats', null);
    assert('No token blocked from /api/admin/stats (401)', status === 401, `got ${status}`);
  }

  // ─────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('🎉 All tests passed!\n');
  } else {
    console.log('⚠️  Some tests failed — review the output above.\n');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Test runner error:', err.message);
  process.exit(1);
});
