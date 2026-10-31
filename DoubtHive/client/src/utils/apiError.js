// Turns a failed API call into a list of messages for the form's error box.
//
// The server always replies with JSON { message, errors? } for real problems
// (wrong password, email taken, validation...). If there is NO such reply — the
// request never reached the server, or the dev proxy answered with an empty
// 5xx because the backend is down — then the real problem is the backend, not
// the user's input, so say that instead of a misleading "check your credentials".
export const SERVER_DOWN_MESSAGE =
  "Can't reach the DoubtHive server. Start the backend (cd server → npm run dev) and make sure MongoDB is running, then try again.";

export function apiErrorMessages(err, fallback) {
  const data = err?.response?.data;

  if (data && typeof data === 'object') {
    if (Array.isArray(data.errors) && data.errors.length) return data.errors;
    if (data.message) return [data.message];
  }

  const status = err?.response?.status;
  if (!err?.response || status >= 500) return [SERVER_DOWN_MESSAGE];

  return [fallback];
}
