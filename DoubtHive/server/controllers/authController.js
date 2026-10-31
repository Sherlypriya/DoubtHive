const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validateRegisterInput, validateLoginInput } = require('../utils/validators');
const { notifyWelcomeUser, notifyAdminNewUser } = require('../services/notificationService');
const { normalizeDepartment } = require('../utils/departments');

const SALT_ROUNDS = 10;

const generateToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// Shape the user object we send back — never leak the password hash
const toSafeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  department: user.department,
  semester: user.semester,
  reputation: user.reputation,
  avatar: user.avatar,
  badges: user.badges || [],
});

// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, department, semester } = req.body;

    const errors = validateRegisterInput({ name, email, password, role, semester });
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const normalizedDept = normalizeDepartment(department);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: role || 'student',
      department: normalizedDept || (role === 'student' ? 'Computer Science' : ''),
      semester: role === 'faculty' || role === 'admin' ? null : (semester ? Number(semester) : 1),
    });

    const token = generateToken(user);

    // Fire-and-forget: welcome onboarding email & admin notification
    notifyWelcomeUser({ user });
    notifyAdminNewUser({ user });

    res.status(201).json({ user: toSafeUser(user), token });
  } catch (error) {
    // Handle duplicate key race condition / mongoose validation errors gracefully
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation failed', errors: Object.values(error.errors).map((e) => e.message) });
    }
    next(error);
  }
};

// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const errors = validateLoginInput({ email, password });
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // password has `select: false` on the schema, so it must be explicitly requested
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    // Use the same generic message whether the email or password is wrong,
    // so we don't leak which emails are registered.
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user);

    res.json({ user: toSafeUser(user), token });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user: toSafeUser(user) });
  } catch (error) {
    next(error);
  }
};
