import { getLevelInfo } from '../constants/game.js';

// Hexagonal "LV 3" chip
export function LevelBadge({ level, size = 'md' }) {
  return (
    <span className={`lv-badge lv-badge--${size}`} aria-label={`Level ${level}`}>
      <span className="lv-badge__lv">LV</span>
      <span className="lv-badge__num">{level}</span>
    </span>
  );
}

// Segmented XP bar. `progress` is 0..1.
export function XpBar({ progress = 0, size = 'md', label }) {
  const pct = Math.round(progress * 100);
  return (
    <div
      className={`xp-bar xp-bar--${size}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={label || 'Experience progress'}
    >
      <div className="xp-bar__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

// Level + title + bar + "N XP to next level"
export function LevelProgress({ xp = 0, size = 'md' }) {
  const info = getLevelInfo(xp);
  return (
    <div className="level-progress">
      <div className="level-progress__row">
        <span className="level-progress__title">{info.title}</span>
        <span className="level-progress__xp">{xp} XP</span>
      </div>
      <XpBar progress={info.progress} size={size} />
      <div className="level-progress__hint">
        {info.maxed ? 'MAX LEVEL reached!' : `${info.toNext} XP to Level ${info.next.level} · ${info.next.title}`}
      </div>
    </div>
  );
}
