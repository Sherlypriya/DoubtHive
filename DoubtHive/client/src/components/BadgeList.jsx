import { BADGE_META, BADGE_IDS } from '../constants/badges.js';

// Full grid for the profile page: earned badges lit up, the rest dimmed
// so people can see what there is left to earn.
export function BadgeGrid({ earned = [] }) {
  const have = new Set(earned);
  return (
    <div className="badge-grid">
      {BADGE_IDS.map((id) => {
        const { label, desc, icon: Icon } = BADGE_META[id];
        const unlocked = have.has(id);
        return (
          <div key={id} className={`badge-chip${unlocked ? '' : ' badge-chip--locked'}`} title={desc}>
            <span className="badge-chip__icon"><Icon size={16} /></span>
            <div>
              <div className="badge-chip__name">{label}</div>
              <div className="badge-chip__desc">{desc}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Compact row of icons for leaderboards / lists.
export function BadgeInline({ badges = [], max = 4 }) {
  const known = badges.filter((b) => BADGE_META[b]);
  if (known.length === 0) return null;
  return (
    <span className="badge-inline">
      {known.slice(-max).map((id) => {
        const { label, icon: Icon } = BADGE_META[id];
        return (
          <span key={id} className="badge-inline__dot" title={label}>
            <Icon size={11} />
          </span>
        );
      })}
    </span>
  );
}
