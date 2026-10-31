import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getLeaderboard } from '../api/userApi';
import { DEPARTMENTS } from '../constants/options';
import { BadgeInline } from '../components/BadgeList.jsx';
import { LevelBadge } from '../components/XpBar.jsx';
import { getLevelInfo } from '../constants/game.js';
import { initials } from '../utils/format.js';

function Leaderboard() {
  const [department, setDepartment] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    getLeaderboard({ department: department || undefined })
      .then(({ data }) => { if (!cancelled) setUsers(data.users); })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load the leaderboard');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [department]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>High scores</h1>
          <p>Ranked by XP earned from accepted answers and upvotes.</p>
        </div>
      </div>

      <div className="filter-bar">
        <select value={department} onChange={(e) => setDepartment(e.target.value)}>
          <option value="">All departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {loading && <p>Loading leaderboard...</p>}
      {error && <p style={{ color: 'var(--rust)' }}>{error}</p>}
      {!loading && !error && users.length === 0 && (
        <div className="empty-state">No players yet. Be the first to earn XP!</div>
      )}

      {!loading && !error && users.length >= 3 && (
        <div className="podium">
          {[1, 0, 2].map((i) => {
            const u = users[i];
            const info = getLevelInfo(u.reputation);
            return (
              <Link key={u._id} to={`/users/${u._id}`} className={`podium__spot podium__spot--${i + 1}`}>
                <div className="podium__medal">{['1ST', '2ND', '3RD'][i]}</div>
                <div className="avatar-hex avatar-hex--lg" aria-hidden="true">{initials(u.name)}</div>
                <div className="podium__name">{u.name}</div>
                <LevelBadge level={info.level} size="sm" />
                <div className="podium__xp">{u.reputation} XP</div>
                <div className="podium__block" />
              </Link>
            );
          })}
        </div>
      )}

      <div className="leaderboard-list">
        {users.map((u, i) => {
          if (users.length >= 3 && i < 3) return null;
          const info = getLevelInfo(u.reputation);
          return (
            <Link key={u._id} to={`/users/${u._id}`} className="leaderboard-row">
              <div className="leaderboard-row__rank">{i + 1}</div>
              <div className="avatar-hex avatar-hex--sm" aria-hidden="true">{initials(u.name)}</div>
              <div className="leaderboard-row__info">
                <div className="leaderboard-row__name">
                  {u.name}{u.role === 'faculty' && <span className="badge badge--faculty" style={{ marginLeft: '0.4rem' }}>Faculty</span>}
                  <BadgeInline badges={u.badges} />
                </div>
                <div className="leaderboard-row__sub">{info.title} · {u.department || 'No department set'}</div>
              </div>
              <LevelBadge level={info.level} size="sm" />
              <div className="leaderboard-row__rep">{u.reputation} XP</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default Leaderboard;
