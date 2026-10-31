const crypto = require('crypto');
const multer = require('multer');
const {
  ANSWER_DIR,
  LIMITS,
  ALLOWED,
  ensureUploadDirs,
  matchesSignature,
  removeUploadedFiles,
} = require('../utils/media');

ensureUploadDirs();

const mb = (bytes) => Math.round(bytes / (1024 * 1024));

class UploadError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, ANSWER_DIR),
  filename: (req, file, cb) => {
    // Random name + extension from our whitelist (never from the original name)
    const ext = ALLOWED[file.mimetype]?.ext || '';
    cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const rule = ALLOWED[file.mimetype];
  if (!rule) {
    return cb(
      new UploadError('Unsupported file type. Use JPG, PNG, GIF or WebP pictures, or MP4, WebM, OGG or MOV videos.')
    );
  }
  if (rule.kind === 'video' && req.user?.role === 'student') {
    return cb(new UploadError('Only faculty can upload lecture videos. You can attach pictures instead.', 403));
  }
  cb(null, true);
};

const build = (maxFileBytes) =>
  multer({
    storage,
    fileFilter,
    limits: { fileSize: maxFileBytes, files: LIMITS.MAX_ATTACHMENTS, fields: 20 },
  }).array('files', LIMITS.MAX_ATTACHMENTS);

// Students can only send pictures, so their request-size ceiling is the image
// limit — an oversized upload is cut off at 5 MB instead of landing on disk.
// Faculty/admin get the larger video ceiling; pictures are re-checked below.
const uploaders = {
  student: build(LIMITS.IMAGE_BYTES),
  faculty: build(LIMITS.VIDEO_BYTES),
  admin: build(LIMITS.VIDEO_BYTES),
};

const translateMulterError = (err) => {
  if (err instanceof UploadError) return err;
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return new UploadError('That file is too large. Pictures: 5 MB max. Videos: 100 MB max.', 413);
    }
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return new UploadError(`You can attach at most ${LIMITS.MAX_ATTACHMENTS} files to one answer.`);
    }
    return new UploadError(err.message);
  }
  return err;
};

// Reject an upload that is still streaming in. If we answered immediately and
// closed the socket with unread bytes pending, the OS would reset the
// connection and the browser would show a bare "Network Error" instead of our
// message (and a reused keep-alive socket would break the NEXT request).
// So: discard the rest of the body (nothing is written to disk), reply, and
// mark the connection non-reusable. A timeout stops slow-drip abuse.
const rejectAfterDrain = (req, res, status, message) => {
  const send = () => {
    if (res.headersSent) return;
    res.set('Connection', 'close');
    res.status(status).json({ message });
  };
  if (req.complete) return send();
  req.resume();
  req.once('end', send);
  req.once('close', send);
  setTimeout(send, 30000).unref();
};

// Use AFTER `protect` (needs req.user). Plain JSON requests pass straight
// through; multipart requests are parsed and every file is verified.
// On success: req.files is an array, each with `.kind` ('image' | 'video').
const answerMedia = (req, res, next) => {
  const upload = uploaders[req.user?.role] || uploaders.student;

  upload(req, res, async (err) => {
    if (err) {
      const e = translateMulterError(err);
      if (e instanceof UploadError) return rejectAfterDrain(req, res, e.status, e.message);
      return next(e);
    }

    const files = req.files || [];
    try {
      for (const file of files) {
        const rule = ALLOWED[file.mimetype];
        const sizeCap = rule.kind === 'image' ? LIMITS.IMAGE_BYTES : LIMITS.VIDEO_BYTES;

        if (file.size > sizeCap) {
          await removeUploadedFiles(files);
          return res.status(413).json({ message: `Pictures can be at most ${mb(LIMITS.IMAGE_BYTES)} MB.` });
        }
        if (!(await matchesSignature(file.path, file.mimetype))) {
          await removeUploadedFiles(files);
          return res.status(400).json({
            message: `"${file.originalname}" doesn't look like a valid ${rule.kind} file.`,
          });
        }
        file.kind = rule.kind;
      }
    } catch (e) {
      await removeUploadedFiles(files);
      return next(e);
    }

    next();
  });
};

module.exports = answerMedia;
module.exports.UploadError = UploadError;
