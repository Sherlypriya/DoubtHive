const fs = require('fs');
const path = require('path');

// All uploaded answer media lives here. Resolved from this file (not the
// process cwd) so the server works no matter where it is started from.
const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
const ANSWER_DIR = path.join(UPLOAD_ROOT, 'answers');
const PUBLIC_PREFIX = '/api/uploads/answers';

const LIMITS = {
  IMAGE_BYTES: 5 * 1024 * 1024,   // 5 MB per picture
  VIDEO_BYTES: 100 * 1024 * 1024, // 100 MB per lecture video
  MAX_ATTACHMENTS: 5,             // files + video links, per answer
};

// Whitelist: MIME type -> { kind, ext }. The stored file extension comes from
// THIS table, never from the client-supplied filename, so a malicious
// "photo.html" can never be saved and served as HTML.
const ALLOWED = {
  'image/jpeg': { kind: 'image', ext: '.jpg' },
  'image/png': { kind: 'image', ext: '.png' },
  'image/gif': { kind: 'image', ext: '.gif' },
  'image/webp': { kind: 'image', ext: '.webp' },
  'video/mp4': { kind: 'video', ext: '.mp4' },
  'video/webm': { kind: 'video', ext: '.webm' },
  'video/ogg': { kind: 'video', ext: '.ogv' },
  'video/quicktime': { kind: 'video', ext: '.mov' },
};

const ensureUploadDirs = () => fs.mkdirSync(ANSWER_DIR, { recursive: true });

// ── Magic-byte check ─────────────────────────────────────────────────────────
// The browser-supplied MIME type is trivially spoofable, so after upload we
// confirm the file's first bytes really match what it claims to be.
const ascii = (buf, start, end) => buf.toString('latin1', start, end);

const SIGNATURES = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.length >= 8 && b[0] === 0x89 && ascii(b, 1, 4) === 'PNG',
  'image/gif': (b) => ['GIF87a', 'GIF89a'].includes(ascii(b, 0, 6)),
  'image/webp': (b) => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP',
  'video/mp4': (b) => ascii(b, 4, 8) === 'ftyp',
  'video/quicktime': (b) => ['ftyp', 'moov', 'mdat', 'wide', 'free'].includes(ascii(b, 4, 8)),
  'video/webm': (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3,
  'video/ogg': (b) => ascii(b, 0, 4) === 'OggS',
};

const matchesSignature = async (filePath, mimetype) => {
  const check = SIGNATURES[mimetype];
  if (!check) return false;
  let handle;
  try {
    handle = await fs.promises.open(filePath, 'r');
    const buf = Buffer.alloc(16);
    const { bytesRead } = await handle.read(buf, 0, 16, 0);
    return bytesRead >= 4 && check(buf.subarray(0, bytesRead));
  } catch {
    return false;
  } finally {
    if (handle) await handle.close();
  }
};

// ── Video links (YouTube / Vimeo) ────────────────────────────────────────────
// We never store or render the raw URL a user pasted. We extract the video id,
// then BUILD the embed URL ourselves on a fixed host — so the iframe src can
// only ever point at youtube-nocookie.com or player.vimeo.com.
const YT_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com'];
const YT_ID = /^[A-Za-z0-9_-]{11}$/;

const parseVideoLink = (raw) => {
  let url;
  try {
    url = new URL(String(raw).trim());
  } catch {
    return null;
  }
  if (!['https:', 'http:'].includes(url.protocol)) return null;

  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split('/').filter(Boolean);

  // YouTube
  let ytId = null;
  if (host === 'youtu.be') ytId = parts[0];
  else if (YT_HOSTS.includes(host)) {
    if (url.pathname === '/watch') ytId = url.searchParams.get('v');
    else if (['embed', 'shorts', 'live', 'v'].includes(parts[0])) ytId = parts[1];
  }
  if (ytId && YT_ID.test(ytId)) {
    return {
      kind: 'embed',
      provider: 'youtube',
      videoId: ytId,
      url: `https://www.youtube-nocookie.com/embed/${ytId}`,
    };
  }

  // Vimeo (optional privacy hash for unlisted videos: vimeo.com/123/abcdef12)
  if (host === 'vimeo.com' || host === 'www.vimeo.com' || host === 'player.vimeo.com') {
    const idIdx = parts.findIndex((p) => /^\d{6,12}$/.test(p));
    if (idIdx !== -1) {
      const id = parts[idIdx];
      const next = parts[idIdx + 1];
      const hash = (next && /^[a-f0-9]{8,16}$/i.test(next) ? next : url.searchParams.get('h')) || '';
      const safeHash = /^[a-f0-9]{8,16}$/i.test(hash) ? hash : '';
      return {
        kind: 'embed',
        provider: 'vimeo',
        videoId: id,
        url: `https://player.vimeo.com/video/${id}${safeHash ? `?h=${safeHash}` : ''}`,
      };
    }
  }

  return null;
};

// ── File cleanup ─────────────────────────────────────────────────────────────
const safeUnlink = async (filePath) => {
  try {
    await fs.promises.unlink(filePath);
  } catch {
    /* already gone — nothing to do */
  }
};

// Delete files that multer just wrote (used when a request fails validation).
const removeUploadedFiles = (files = []) =>
  Promise.all((files || []).map((f) => f && f.path && safeUnlink(f.path)));

// Delete the on-disk files behind stored attachments (answer deleted/edited).
// Embeds have no file. basename() blocks any path-traversal in `filename`.
const removeAttachmentFiles = (attachments = []) =>
  Promise.all(
    (attachments || [])
      .filter((a) => a && a.filename)
      .map((a) => safeUnlink(path.join(ANSWER_DIR, path.basename(a.filename))))
  );

module.exports = {
  UPLOAD_ROOT,
  ANSWER_DIR,
  PUBLIC_PREFIX,
  LIMITS,
  ALLOWED,
  ensureUploadDirs,
  matchesSignature,
  parseVideoLink,
  removeUploadedFiles,
  removeAttachmentFiles,
};
