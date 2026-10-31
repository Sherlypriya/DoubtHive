// Mirrors the limits enforced on the server (server/utils/media.js).
// The server is the real gatekeeper; these just give instant feedback.
export const MEDIA_LIMITS = {
  IMAGE_MB: 5,
  VIDEO_MB: 100,
  MAX_ATTACHMENTS: 5,
};

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];

export const formatBytes = (bytes = 0) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

// Light client-side check so a bad link is caught before posting. The server
// re-validates and builds the actual embed URL itself.
export function detectVideoProvider(raw) {
  let url;
  try { url = new URL(String(raw).trim()); } catch { return null; }
  if (!['https:', 'http:'].includes(url.protocol)) return null;
  const host = url.hostname.toLowerCase();
  if (['youtu.be', 'youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host)) return 'youtube';
  if (['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(host)) return 'vimeo';
  return null;
}
