import { QUESTS } from '../constants/game.js';
import { XpBar } from './XpBar.jsx';
import { Swords, Trophy } from 'lucide-react';

// Shows the 3 closest unfinished quests with progress bars.
export default function QuestBoard({ stats, xp = 0, earned = [], max = 3 }) {
  const values = {
    questions: stats?.questionsCount || 0,
    answers: stats?.answersCount || 0,
    accepted: stats?.acceptedAnswersCount || 0,
    xp,
  };
  const have = new Set(earned);

  const open = QUESTS
    .filter((q) => !have.has(q.id))
    .map((q) => ({ ...q, value: Math.min(values[q.stat], q.goal) }))
    .sort((a, b) => b.value / b.goal - a.value / a.goal)
    .slice(0, max);

  return (
    <div className="quest-board">
      <div className="quest-board__head"><Swords size={14} /> Active quests</div>
      {open.length === 0 ? (
        <div className="quest-board__done"><Trophy size={16} /> All quests complete. Legend!</div>
      ) : (
        open.map((q) => (
          <div key={q.id} className="quest">
            <div className="quest__row">
              <span className="quest__title">{q.title}</span>
              <span className="quest__count">{q.value}/{q.goal}</span>
            </div>
            <XpBar progress={q.value / q.goal} size="sm" label={q.title} />
            <div className="quest__reward">Reward: “{q.reward}” badge</div>
          </div>
        ))
      )}
    </div>
  );
}
