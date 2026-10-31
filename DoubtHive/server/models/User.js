const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}$/, 'Please enter a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // never return password by default
    },
    role: {
      type: String,
      enum: ['student', 'faculty', 'admin'],
      default: 'student',
    },
    department: {
      type: String,
      trim: true,
      default: '',
    },
    // Subject areas taught or mentored (especially relevant for faculty notification mapping)
    subjects: [{ type: String, trim: true }],
    semester: {
      type: Number,
      min: 1,
      max: 12,
      // Only relevant for students; faculty/admin can leave this unset
      default: null,
    },
    reputation: {
      type: Number,
      default: 0,
    },
    // Gamification extras (used elsewhere in the app)
    badges: [{ type: String }],
    avatar: { type: String, default: '' },
    // Questions the user has saved for later
    bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
