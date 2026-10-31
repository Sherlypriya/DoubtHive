// Game rules for the client. XP is just the user's existing `reputation`,
// so no server changes are needed.

export const LEVELS = [
  { level: 1, min: 0,   title: 'Hatchling' },
  { level: 2, min: 10,  title: 'Larva' },
  { level: 3, min: 25,  title: 'Worker Bee' },
  { level: 4, min: 50,  title: 'Forager' },
  { level: 5, min: 80,  title: 'Scout Bee' },
  { level: 6, min: 120, title: 'Guardian' },
  { level: 7, min: 170, title: 'Royal Guard' },
  { level: 8, min: 230, title: 'Hive Master' },
  { level: 9, min: 300, title: 'Queen Bee' },
];

// Mirrors REP in server/controllers/answerController.js
export const XP_REWARDS = { ACCEPTED_ANSWER: 10, UPVOTE: 2 };

export function getLevelInfo(xp = 0) {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].min) idx = i;
  const cur = LEVELS[idx];
  const next = LEVELS[idx + 1] || null;
  const span = next ? next.min - cur.min : 1;
  const into = next ? xp - cur.min : 1;
  return {
    level: cur.level,
    title: cur.title,
    xp,
    next,
    maxed: !next,
    progress: next ? Math.max(0, Math.min(1, into / span)) : 1,
    toNext: next ? next.min - xp : 0,
  };
}

// Quests are the badge goals, shown with live progress.
// `stat` keys match what the profile endpoint returns.
export const QUESTS = [
  { id: 'first-question', title: 'Ask your first doubt',     goal: 1,   stat: 'questions', reward: 'First Doubt' },
  { id: 'first-answer',   title: 'Post your first answer',   goal: 1,   stat: 'answers',   reward: 'First Reply' },
  { id: 'problem-solver', title: 'Get an answer accepted',   goal: 1,   stat: 'accepted',  reward: 'Problem Solver' },
  { id: 'curious-mind',   title: 'Ask 5 questions',          goal: 5,   stat: 'questions', reward: 'Curious Mind' },
  { id: 'helpful-hand',   title: 'Post 5 answers',           goal: 5,   stat: 'answers',   reward: 'Helpful Hand' },
  { id: 'hive-expert',    title: 'Get 5 answers accepted',   goal: 5,   stat: 'accepted',  reward: 'Hive Expert' },
  { id: 'rising-star',    title: 'Reach 50 XP',              goal: 50,  stat: 'xp',        reward: 'Rising Star' },
  { id: 'hive-legend',    title: 'Reach 150 XP',             goal: 150, stat: 'xp',        reward: 'Hive Legend' },
];
