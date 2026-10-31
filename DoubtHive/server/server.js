require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const { UPLOAD_ROOT, ensureUploadDirs } = require('./utils/media');

// Route imports
const authRoutes = require('./routes/authRoutes');
const questionRoutes = require('./routes/questionRoutes');
const answerRoutes = require('./routes/answerRoutes');
const userRoutes = require('./routes/userRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const perkRoutes = require('./routes/perkRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false, // allow embedding (Vite dev proxy)
  contentSecurityPolicy: false,     // CSP handled by Vite/Nginx in production
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
const parseAllowedOrigins = () => {
  const configured = (process.env.CLIENT_URL || '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const defaults = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ];

  return [...new Set([...configured, ...defaults])];
};

const allowedOrigins = parseAllowedOrigins();

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server, curl, Postman or same-origin requests with no origin
    if (!origin) return callback(null, true);

    const normalized = origin.trim().replace(/\/+$/, '');

    // Allow configured origins or Vercel preview/production deployments
    if (
      allowedOrigins.includes(normalized) ||
      /^https:\/\/[a-z0-9-]+(\.vercel\.app)$/i.test(normalized)
    ) {
      return callback(null, true);
    }

    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// ── Uploaded media (answer pictures + lecture videos) ─────────────────────────
// Mounted BEFORE the rate limiters on purpose: a single video can trigger many
// HTTP range requests while the viewer seeks, and that must not eat the
// per-IP API budget. express.static handles Range requests (video seeking),
// and `nosniff` + extension-from-whitelist means a file can only ever be
// served as the image/video type it was verified to be.
ensureUploadDirs();
app.use(
  '/api/uploads',
  (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  },
  express.static(UPLOAD_ROOT, { index: false, dotfiles: 'deny', maxAge: '7d', immutable: true })
);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Auth endpoints: tighter limit to slow brute-force attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP, please try again in 15 minutes.' },
});

// General API: generous limit, just prevents runaway scraping
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP, please slow down.' },
});

app.use('/api/', generalLimiter);
app.use('/api/auth', authLimiter);

// ── Health checks ─────────────────────────────────────────────────────────────
const healthHandler = (req, res) => {
  const mongoose = require('mongoose');
  const isConnected = mongoose.connection.readyState === 1;

  res.status(isConnected ? 200 : 503).json({
    status: isConnected ? 'ok' : 'degraded',
    message: isConnected ? 'DoubtHive API is running' : 'Database connection pending/failed',
    database: isConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/answers', answerRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/perks', perkRoutes);
app.use('/api/admin', adminRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ── Central error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Don't leak CORS errors in detail to the client
  if (err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ message: 'CORS: request blocked' });
  }
  console.error('[ERROR]', err.stack || err.message);
  res.status(err.statusCode || 500).json({ message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Ensure database is fully connected before accepting incoming HTTP requests
    await connectDB();

    app.listen(PORT, () => {
      console.log(`DoubtHive server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
    });
  } catch (error) {
    console.error('Fatal startup error:', error.message);
    process.exit(1);
  }
};

startServer();
