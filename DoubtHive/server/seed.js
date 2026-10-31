/**
 * DoubtHive — Safe Seed Script
 * ─────────────────────────────────────────────────────────────────────────────
 * SAFE: This script NEVER drops collections or deletes existing data.
 * It only inserts records that don't already exist (idempotent).
 * It is safe to run multiple times.
 *
 * Usage (from the /server directory):
 *   node seed.js
 *
 * What it creates (only if not already present):
 *   - 3 demo user accounts (student, faculty, admin)
 *   - 5 sample questions
 *   - 2 sample answers
 *   - 5 demo perks
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const User = require('./models/User');
const Question = require('./models/Question');
const Answer = require('./models/Answer');
const Perk = require('./models/Perk');

const SALT_ROUNDS = 10;

// ── Demo accounts ──────────────────────────────────────────────────────────────
const DEMO_USERS = [
  {
    name: 'Arjun Mehta',
    email: 'student@demo.com',
    password: 'demo1234',
    role: 'student',
    department: 'Computer Science',
    semester: 4,
    reputation: 12,
    badges: ['first-question', 'first-answer'],
  },
  {
    name: 'Dr. Priya Nair',
    email: 'faculty@demo.com',
    password: 'demo1234',
    role: 'faculty',
    department: 'Computer Science',
    subjects: ['Data Structures', 'Computer Networks', 'Database Management Systems', 'Operating Systems'],
    reputation: 85,
    badges: ['first-answer', 'helpful-hand', 'problem-solver', 'rising-star'],
  },
  {
    name: 'Admin User',
    email: 'admin@demo.com',
    password: 'demo1234',
    role: 'admin',
    department: 'Administration',
    reputation: 0,
    badges: [],
  },
];

// ── Demo perks ─────────────────────────────────────────────────────────────────
const DEMO_PERKS = [
  {
    title: 'Free Canteen Beverage',
    description: 'Redeem for one free tea or coffee at the college canteen. Present your redemption code at the counter.',
    cost: 20,
    category: 'canteen',
    totalStock: 50,
    icon: 'coffee',
    isDemo: true,
  },
  {
    title: 'Stationery Pack',
    description: 'A set of pens, a notebook, and a highlighter from the college stationery store.',
    cost: 35,
    category: 'stationery',
    totalStock: 30,
    icon: 'pen',
    isDemo: true,
  },
  {
    title: 'Library Late Return Pass',
    description: 'A 7-day grace extension on your current library book borrow period. No late fine applied.',
    cost: 15,
    category: 'library',
    totalStock: 100,
    icon: 'book',
    isDemo: true,
  },
  {
    title: 'Event Priority Seating',
    description: 'Reserve a front-row seat at the next college tech talk or cultural event.',
    cost: 50,
    category: 'event',
    totalStock: 20,
    icon: 'ticket',
    isDemo: true,
  },
  {
    title: 'DoubtHive Legend Badge (Exclusive)',
    description: 'A digital certificate recognising you as a top contributor on DoubtHive this semester.',
    cost: 150,
    category: 'other',
    totalStock: null,
    icon: 'award',
    isDemo: true,
  },
];

// ── Sample questions ───────────────────────────────────────────────────────────
const buildQuestions = (studentId, facultyId) => [
  {
    userId: studentId,
    title: 'Why does my recursive Fibonacci function run out of memory for large inputs?',
    description:
      'I wrote a simple recursive function for Fibonacci numbers but it throws a stack overflow for n > 40.\n\n```python\ndef fib(n):\n    if n <= 1:\n        return n\n    return fib(n - 1) + fib(n - 2)\n\nprint(fib(50))\n```\n\nIs there a way to fix this without completely rewriting the logic?',
    tags: ['recursion', 'python', 'stack-overflow', 'dynamic-programming'],
    subject: 'Data Structures',
    department: 'Computer Science',
    semester: 4,
    status: 'resolved',
    answersCount: 2,
    views: 47,
  },
  {
    userId: studentId,
    title: 'What is the difference between TCP and UDP? When should I use each?',
    description:
      'I keep confusing TCP and UDP. I understand one is reliable and the other is fast, but I don\'t know how to decide which one to use for a given application.',
    tags: ['tcp', 'udp', 'networking', 'protocols'],
    subject: 'Computer Networks',
    department: 'Computer Science',
    semester: 4,
    status: 'open',
    answersCount: 1,
    views: 23,
  },
  {
    userId: facultyId,
    title: 'How do database transactions ensure ACID properties?',
    description:
      'Can someone explain with a simple example how Atomicity, Consistency, Isolation, and Durability are maintained in a relational database? I want to use this as a teaching example for my class.',
    tags: ['acid', 'transactions', 'database', 'rdbms'],
    subject: 'Database Management Systems',
    department: 'Computer Science',
    semester: 4,
    status: 'open',
    answersCount: 0,
    views: 15,
  },
  {
    userId: studentId,
    title: 'Difference between process and thread in Operating Systems',
    description:
      'I need to understand the core difference between a process and a thread for my exam tomorrow. What are the key points I should remember?',
    tags: ['process', 'thread', 'os', 'concurrency'],
    subject: 'Operating Systems',
    department: 'Computer Science',
    semester: 4,
    status: 'open',
    answersCount: 0,
    views: 8,
  },
  {
    userId: studentId,
    title: 'How to implement a binary search tree in Java with insert and search?',
    description:
      'I need to implement a BST in Java for my assignment. I understand the concept but I\'m struggling with the recursive insert logic. Can someone show a clean implementation?\n\nI\'ve tried:\n```java\nclass Node { int data; Node left, right; }\n```\nbut I don\'t know how to wire the recursion.',
    tags: ['bst', 'java', 'trees', 'recursion'],
    subject: 'Data Structures',
    department: 'Computer Science',
    semester: 4,
    status: 'open',
    answersCount: 0,
    views: 12,
  },
];

// ── Main seeder ────────────────────────────────────────────────────────────────
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // ── Users ──
  const createdUsers = {};
  for (const u of DEMO_USERS) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      console.log(`  ↷  User already exists: ${u.email}`);
      createdUsers[u.role] = existing;
    } else {
      const hashed = await bcrypt.hash(u.password, SALT_ROUNDS);
      const user = await User.create({ ...u, password: hashed });
      createdUsers[u.role] = user;
      console.log(`  ✔  Created user: ${u.email} (${u.role})`);
    }
  }

  // ── Perks ──
  for (const p of DEMO_PERKS) {
    const existing = await Perk.findOne({ title: p.title });
    if (existing) {
      console.log(`  ↷  Perk already exists: "${p.title}"`);
    } else {
      await Perk.create(p);
      console.log(`  ✔  Created perk: "${p.title}" (${p.cost} XP)`);
    }
  }

  // ── Questions ──
  const studentId = createdUsers['student']._id;
  const facultyId = createdUsers['faculty']._id;
  const questions = buildQuestions(studentId, facultyId);

  const createdQMap = {};
  for (const q of questions) {
    const existing = await Question.findOne({ title: q.title });
    if (existing) {
      console.log(`  ↷  Question already exists: "${q.title.slice(0, 50)}..."`);
      createdQMap[q.title] = existing;
    } else {
      const created = await Question.create(q);
      createdQMap[q.title] = created;
      console.log(`  ✔  Created question: "${q.title.slice(0, 50)}..."`);
    }
  }

  // ── Answers ──
  const fibQ = Object.values(createdQMap).find((q) => q.title.includes('Fibonacci'));
  if (fibQ) {
    const ans1Exists = await Answer.findOne({ questionId: fibQ._id, userId: createdUsers['student']._id });
    if (!ans1Exists) {
      await Answer.create({
        questionId: fibQ._id,
        userId: createdUsers['student']._id,
        content:
          'You can use memoization (top-down DP) to avoid recomputing the same values:\n\n```python\ndef fib(n, memo={}):\n    if n in memo:\n        return memo[n]\n    if n <= 1:\n        return n\n    memo[n] = fib(n - 1, memo) + fib(n - 2, memo)\n    return memo[n]\n\nprint(fib(100))  # Works instantly\n```\n\nThis reduces time complexity from O(2^n) to O(n).',
        isFacultyAnswer: false,
        upvotes: 3,
        downvotes: 0,
      });
      console.log('  ✔  Created student answer on Fibonacci question');
    } else {
      console.log('  ↷  Student answer on Fibonacci already exists');
    }

    const ans2Exists = await Answer.findOne({ questionId: fibQ._id, userId: createdUsers['faculty']._id });
    if (!ans2Exists) {
      const facultyAns = await Answer.create({
        questionId: fibQ._id,
        userId: createdUsers['faculty']._id,
        content:
          'Great question! The root cause is **exponential time complexity** — each call branches into two more, giving O(2^n) calls.\n\nTwo standard fixes:\n\n1. **Memoization** (top-down DP) — cache computed results as shown by Arjun above.\n\n2. **Bottom-up DP** — even better for large n, O(n) time, O(1) space:\n\n```python\ndef fib(n):\n    if n <= 1: return n\n    a, b = 0, 1\n    for _ in range(2, n + 1):\n        a, b = b, a + b\n    return b\n```\n\nFor very large n, use Python\'s built-in `functools.lru_cache`:\n\n```python\nfrom functools import lru_cache\n\n@lru_cache(maxsize=None)\ndef fib(n):\n    if n <= 1: return n\n    return fib(n-1) + fib(n-2)\n```',
        isFacultyAnswer: true,
        isAccepted: true,
        upvotes: 7,
        downvotes: 0,
      });
      console.log('  ✔  Created faculty (accepted) answer on Fibonacci question');

      // Ensure the question shows resolved status
      await Question.findByIdAndUpdate(fibQ._id, { status: 'resolved' });
      // Award reputation for accepted answer
      await User.findByIdAndUpdate(createdUsers['faculty']._id, { $inc: { reputation: 10 } });
      console.log('  ✔  Marked Fibonacci question as resolved, awarded reputation to faculty');
    } else {
      console.log('  ↷  Faculty answer on Fibonacci already exists');
    }
  }

  console.log('\n🐝 Seed complete!\n');
  console.log('Demo accounts:');
  console.log('  Student  → student@demo.com   / demo1234');
  console.log('  Faculty  → faculty@demo.com   / demo1234');
  console.log('  Admin    → admin@demo.com     / demo1234\n');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  mongoose.disconnect();
  process.exit(1);
});
