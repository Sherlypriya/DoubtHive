const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
    },
    tags: {
      type: [String],
      default: [],
      // normalize every tag: lowercase + trimmed, no empty strings
      set: (tags) =>
        Array.isArray(tags)
          ? [...new Set(tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean))]
          : [],
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    semester: {
      type: Number,
      min: [1, 'Semester must be between 1 and 12'],
      max: [12, 'Semester must be between 1 and 12'],
      default: 1,
    },
    status: {
      type: String,
      enum: ['open', 'resolved'],
      default: 'open',
    },
    // Tracked here (rather than derived) so unanswered=true filtering works
    // even before the Answer sub-system lands in the next phase.
    answersCount: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true } // adds createdAt + updatedAt
);

// Speeds up the common filters/list queries
questionSchema.index({ subject: 1 });
questionSchema.index({ department: 1 });
questionSchema.index({ semester: 1 });
questionSchema.index({ tags: 1 });
questionSchema.index({ createdAt: -1 });
questionSchema.index({ title: 'text', description: 'text' }); // for search

module.exports = mongoose.model('Question', questionSchema);
