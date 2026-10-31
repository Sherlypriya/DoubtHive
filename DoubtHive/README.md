# 🐝 DoubtHive — Gamified Doubt Resolution Platform

> **Ask. Answer. Learn. Earn.** — Turn academic doubts into XP-fuelled quests.

DoubtHive is a college mini-project where students post academic doubts, receive answers from peers and faculty, and earn reputation points and badges for participation.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite, React Router v6, Axios, Lucide Icons |
| Backend | Node.js 18+, Express 4, express-rate-limit, Helmet |
| Database | MongoDB (Mongoose ODM) |
| Auth | JWT (jsonwebtoken) + bcrypt |
| File uploads | Multer (answer pictures + lecture videos, stored on local disk) |

---

## Features

### Core
- **Ask & answer doubts** — rich text with fenced code block support and a copy button
- **Voting** — upvote / downvote answers (no self-voting); toggles and switches allowed
- **Reputation system** — +2 per upvote received, -1 per downvote, +10 for accepted answer
- **Accept answer** — question owner marks one answer as the solution; question becomes Resolved
- **Rich answers: text, pictures & lecture videos** — see [Answer media](#answer-media) below
- **Edit questions & answers** — inline editing for authors; no page reload needed
- **Delete** — authors can delete their own questions/answers (cascading cleanup)
- **View counter** — counted once per browser session per question

### Gamification
- **XP & Levels** — 9 levels from Hatchling to Queen Bee driven entirely by reputation score
- **9 Badges** — auto-awarded: First Doubt, Curious Mind, First Reply, Helpful Hand, Problem Solver, Hive Expert, Crowd Favorite, Rising Star, Hive Legend
- **Level-up animation** — full-screen confetti burst when the player reaches a new level
- **Leaderboard** — podium (top 3) + full list with department filter and badge icons
- **Quest Board** — sidebar showing the 3 closest unfinished quests with live progress bars
- **Perks / Rewards Shop** — spend XP on campus perks (simulated demo rewards); confirmation modal, redemption code, redemption history

### UX
- **Dark / Light theme** — toggle in the navbar; respects system preference by default
- **Notifications** — bell in navbar (polls every 30 s, refreshes on tab focus); notified on new answer, upvote, badge, and accepted answer
- **Bookmarks** — save questions; view them on the Saved page
- **Similar question suggestions** — live while typing the question title (MongoDB text index)
- **Draft autosave** — AskQuestion form saves to localStorage
- **Toast notifications** — replace all browser alert() calls
- **Skeleton loaders** — on question feed, profile, and leaderboard
- **Search & filters** — search, subject, department, status, sort (newest/oldest/most-answered/most-viewed), unanswered-only
- **Protected routes** — unauthenticated users redirected to /login with return URL

### Security
- **Helmet** — sets secure HTTP headers
- **CORS** — restricted to `CLIENT_URL` (env var) only
- **Rate limiting** — auth endpoints: 30 req / 15 min; general API: 500 req / 15 min
- **Input validation** — sanitized at registration and login
- **Role enforcement** — server-side `requireRole()` middleware on every privileged endpoint
- **No self-voting** — enforced server-side
- **Atomic perk redemption** — MongoDB session/transaction prevents double-spending

### Admin
- **Admin dashboard** (`/admin`) — platform stats, user management (role changes), question moderation (delete), perk CRUD
- **Role-based access** — admin, faculty, student enforced server-side; protected in the UI

---

## Project Structure

```
DoubtHive/
├── client/                       # React frontend (Vite)
│   ├── src/
│   │   ├── api/                  # Axios calls: auth, question, answer, user, notification, perk, admin
│   │   ├── components/           # Navbar, AnswerSection, PlayerCard, QuestionCard, XpBar, BadgeList,
│   │   │                         # QuestBoard, LevelUpWatcher, RichText, AuthLayout, NotificationBell,
│   │   │                         # ProtectedRoute
│   │   ├── context/              # AuthContext, ThemeContext, ToastContext
│   │   ├── constants/            # game.js (levels, XP rewards, quests), badges.js, options.js
│   │   ├── pages/                # Home, Login, Register, AskQuestion, QuestionDetail, Profile,
│   │   │                         # Leaderboard, Saved, Perks, AdminDashboard, NotFound
│   │   ├── utils/                # format.js (initials, timeAgo)
│   │   ├── App.jsx               # Routes (with ProtectedRoute + GuestRoute)
│   │   ├── main.jsx
│   │   └── index.css             # "Neon Arena" design system (~1300 lines)
│   ├── index.html
│   ├── vite.config.js            # Proxies /api → localhost:5000
│   └── package.json
│
├── server/                       # Express backend
│   ├── config/db.js              # MongoDB connection
│   ├── controllers/              # auth, question, answer, user, notification, perk, admin
│   ├── middleware/               # authMiddleware.js (protect, optionalAuth, requireRole)
│   │                             # uploadMiddleware.js (Multer — role-aware answer media uploads)
│   ├── models/                   # User, Question, Answer, Notification, Perk, Redemption
│   ├── routes/                   # auth, question, answer, user, notification, perk, admin
│   ├── utils/                    # badges.js, notify.js, validators.js
│   ├── seed.js                   # ★ Safe seed (never drops data — idempotent)
│   ├── server.js                 # Express app with Helmet + CORS + rate-limit
│   └── package.json
│
├── .env.example                  # Template for server/.env
├── .gitignore
└── README.md
```

---

## Prerequisites

- **Node.js** v18+
- **npm** v8+
- **MongoDB** — local (`mongod`) or free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

---

## Getting Started

### 1. Open the project folder in terminal

```bash
cd DoubtHive
```

### 2. Configure environment variables

Ensure `server/.env` exists (copy from `.env.example` if needed):

```bash
# Windows
copy .env.example server\.env

# Linux / Mac
cp .env.example server/.env
```

Default values work out-of-the-box for local development:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/doubthive
JWT_SECRET=doubthive_dev_secret_2026_make_this_long_and_random
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

### 3. Install all dependencies (first time only)

```bash
# Install root orchestrator (concurrently)
npm install

# Install server & client dependencies
npm --prefix server install
npm --prefix client install
```

### 4. Start frontend and backend with ONE single command

```bash
npm run dev
```

This starts both services concurrently in your terminal:
- **Client (React + Vite)**: `http://localhost:5173`
- **Server (Express + MongoDB)**: `http://localhost:5000`
- **Health Check**: `http://localhost:5000/health`

Press `Ctrl + C` at any time to cleanly stop both services simultaneously.

### 5. (Optional) Seed demo accounts

In a terminal, run:
```bash
npm run seed
```

**Demo credentials:**
| Role | Email | Password |
|------|-------|----------|
| Student | student@demo.com | demo1234 |
| Faculty | faculty@demo.com | demo1234 |
| Admin | admin@demo.com | demo1234 |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGO_URI` | ✅ | — | MongoDB connection string |
| `PORT` | | `5000` | Express server port |
| `NODE_ENV` | | `development` | Environment mode |
| `JWT_SECRET` | ✅ | — | Secret key for signing JWTs |
| `JWT_EXPIRES_IN` | | `7d` | Token TTL (e.g. `7d`, `24h`) |
| `CLIENT_URL` | | `http://localhost:5173` | Allowed CORS origin |

---

## API Endpoints

### Auth
| Method | Route | Auth | Notes |
|--------|-------|------|-------|
| POST | `/api/auth/register` | — | Register new user |
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/auth/me` | ✅ | Restore session |

### Questions
| Method | Route | Auth | Notes |
|--------|-------|------|-------|
| GET | `/api/questions` | opt | Feed with filters: `search, subject, department, status, sort, unanswered, page, limit` |
| GET | `/api/questions/stats` | — | Total / open / resolved counts |
| GET | `/api/questions/similar?title=` | — | Text-index suggestions |
| GET | `/api/questions/saved` | ✅ | Bookmarked questions |
| GET | `/api/questions/:id` | opt | Single question |
| POST | `/api/questions` | ✅ | Create question |
| PATCH | `/api/questions/:id` | ✅ | Edit own question |
| DELETE | `/api/questions/:id` | ✅ | Delete own question |
| POST | `/api/questions/:id/view` | opt | Record a view |
| POST | `/api/questions/:id/bookmark` | ✅ | Toggle bookmark |

### Answers
| Method | Route | Auth | Notes |
|--------|-------|------|-------|
| GET | `/api/answers/question/:id` | opt | Answers for a question |
| POST | `/api/answers` | ✅ | Post answer — JSON, or `multipart/form-data` with `content`, `files[]` (pictures / videos) and `videoLinks[]` (faculty) |
| PATCH | `/api/answers/:id` | ✅ | Edit own answer — also accepts `files[]`, `videoLinks[]`, `removeAttachmentIds[]` |
| DELETE | `/api/answers/:id` | ✅ | Delete own answer |
| PATCH | `/api/answers/:id/accept` | ✅ | Accept answer (question owner only) |
| POST | `/api/answers/:id/vote` | ✅ | Vote `{ value: 1 \| -1 }` |

### Users
| Method | Route | Auth | Notes |
|--------|-------|------|-------|
| GET | `/api/users/:id` | — | Profile with stats, questions, answers |
| GET | `/api/users/leaderboard` | — | Top players (optional `department` filter) |

### Notifications
| Method | Route | Auth | Notes |
|--------|-------|------|-------|
| GET | `/api/notifications` | ✅ | Latest 30 + unread count |
| PATCH | `/api/notifications/read-all` | ✅ | Mark all as read |
| PATCH | `/api/notifications/:id/read` | ✅ | Mark one as read |

### Perks
| Method | Route | Auth | Notes |
|--------|-------|------|-------|
| GET | `/api/perks` | — | Active perks |
| GET | `/api/perks/:id` | — | Single perk |
| POST | `/api/perks/:id/redeem` | ✅ | Redeem (atomic transaction) |
| GET | `/api/perks/my-redemptions` | ✅ | Own redemption history |
| GET | `/api/perks/admin/all` | Admin | All perks incl. inactive |
| POST | `/api/perks/admin` | Admin | Create perk |
| PATCH | `/api/perks/admin/:id` | Admin | Update perk |
| DELETE | `/api/perks/admin/:id` | Admin | Delete perk |
| GET | `/api/perks/admin/redemptions` | Admin | All redemptions |
| PATCH | `/api/perks/admin/redemptions/:id` | Admin | Fulfil / cancel redemption |

### Admin
| Method | Route | Auth | Notes |
|--------|-------|------|-------|
| GET | `/api/admin/stats` | Admin | Platform statistics |
| GET | `/api/admin/users` | Admin | User list with search/filter |
| PATCH | `/api/admin/users/:id/role` | Admin | Change user role |
| GET | `/api/admin/questions` | Admin | Questions with filter |
| DELETE | `/api/admin/questions/:id` | Admin | Force-delete question |
| DELETE | `/api/admin/answers/:id` | Admin | Force-delete answer |

---

## Reputation Rules

| Action | Change |
|--------|--------|
| Receive an upvote | +2 |
| Receive a downvote | -1 |
| Answer accepted | +10 |
| Remove an upvote | −2 |
| Remove a downvote | +1 |
| Delete an accepted answer | −10 (reverted) |

---

## Troubleshooting

**"Login failed" / "Registration failed" / "Can't reach the DoubtHive server"**
The web app can't talk to the API. In order:
1. **Is MongoDB running?** The API stops on startup if it can't reach the database. Windows: `net start MongoDB` in an Administrator PowerShell (or just run `start-dev.bat` as administrator).
2. **Is the API running?** In `server/` run `npm run dev` — you should see `DoubtHive server running on port 5000` **and** `MongoDB connected`. Check http://localhost:5000/api/health in the browser.
3. **Demo accounts missing?** Run `node seed.js` once in `server/` (login then works with `student@demo.com` / `faculty@demo.com` / `admin@demo.com`, password `demo1234`).
4. Did you restart the API after pulling new code? Stop it and run `npm run dev` again.

---

## Answer media

Answers can combine **text, pictures and lecture videos** — an answer may even be media-only.

| Who | Can attach |
|-----|-----------|
| Students | Pictures (JPG, PNG, GIF, WebP — up to **5 MB** each) |
| Faculty / Admin | Pictures **plus** lecture videos: uploaded files (MP4, WebM, OGG, MOV — up to **100 MB** each) or **YouTube / Vimeo links** |

Up to **5 attachments** per answer. Authors can remove or add attachments when editing.

How it works / safety:
- Role rules are enforced **server-side** (a student cannot upload a video or add a video link by calling the API directly).
- Files are verified by **magic bytes**, not just the browser-reported type; stored under a random name with an extension taken from a fixed whitelist, and served with `X-Content-Type-Options: nosniff`.
- Video links are never embedded as pasted: the server extracts the video id and rebuilds the embed URL on `youtube-nocookie.com` / `player.vimeo.com` only.
- Uploads are served from `/api/uploads/*` with HTTP Range support (video seeking), outside the API rate limiter.
- Deleting an answer, a question, or removing an attachment also deletes the files from disk.
- Limits live in `server/utils/media.js` (and are mirrored in `client/src/constants/media.js` for instant feedback). If you deploy behind Nginx, raise `client_max_body_size` to at least `110m`.

---

## Known Limitations

- **No real-time updates** — notifications use 30-second polling instead of WebSockets
- **Demo perks only** — redemption codes are not redeemable at any real campus facility
- **Media is stored on local disk** (`server/uploads/`) — fine for a college deployment on a VM, but on ephemeral hosts (Render/Heroku free tiers) files vanish on redeploy; swap the Multer storage engine for S3/Cloudinary there
- **Attachments are on answers only** — questions are still text-only
- **No email notifications** — out of scope for this mini-project
- **npm audit** — existing dev-only vulnerabilities in `nodemon` (braces) and `@mapbox/node-pre-gyp` (tar, install-time only); not runtime exploitable in this context

---

## Future Extensions

- Real-time notifications with Socket.io
- Comments on answers
- Picture attachments on questions
- Semester-based leaderboard reset
- Faculty verification badge
- Rate-limit admin actions separately
- Email confirmation on registration
