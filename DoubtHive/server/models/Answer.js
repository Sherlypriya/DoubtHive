const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Text is optional when the answer carries media (a picture-only or
    // video-only answer is fine) — the pre-validate hook below enforces
    // "text OR at least one attachment".
    content: {
      type: String,
      default: '',
      trim: true,
      validate: {
        validator: (v) => v === '' || v.length >= 2,
        message: 'Answer must be at least 2 characters',
      },
    },
    // Pictures, uploaded lecture videos, and YouTube/Vimeo links.
    //  - image / video: a file we store on disk (url = /api/uploads/answers/<filename>)
    //  - embed: an external video; url is an embed URL WE built from a
    //    validated video id (never the raw pasted link)
    attachments: {
      type: [
        {
          kind: { type: String, enum: ['image', 'video', 'embed'], required: true },
          url: { type: String, required: true },
          filename: { type: String }, // on-disk name, uploads only
          originalName: { type: String, trim: true, maxlength: 150 },
          mimeType: { type: String },
          size: { type: Number },
          provider: { type: String, enum: ['youtube', 'vimeo'] }, // embeds only
        },
      ],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 5,
        message: 'An answer can have at most 5 attachments',
      },
    },
    // Set server-side from the author's role at creation time — never trust
    // a client-supplied value for this, or anyone could fake the badge.
    isFacultyAnswer: {
      type: Boolean,
      default: false,
    },
    isAccepted: {
      type: Boolean,
      default: false,
    },
    upvotes: {
      type: Number,
      default: 0,
    },
    downvotes: {
      type: Number,
      default: 0,
    },
    // One entry per user who has voted, so we can enforce "one vote per
    // user" and let them change/remove it. Never sent to the client as-is —
    // the controller strips it down to the viewer's own vote.
    voters: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        value: { type: Number, enum: [1, -1] },
      },
    ],
  },
  { timestamps: true } // adds createdAt + updatedAt
);

answerSchema.pre('validate', function requireTextOrMedia(next) {
  if (!this.content && (!this.attachments || this.attachments.length === 0)) {
    this.invalidate('content', 'Write an answer or attach a picture or video');
  }
  next();
});

answerSchema.index({ questionId: 1, createdAt: 1 });

module.exports = mongoose.model('Answer', answerSchema);
