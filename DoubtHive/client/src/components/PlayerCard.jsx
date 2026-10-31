import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { getUserProfile } from '../api/userApi';
import { getLevelInfo } from '../constants/game.js';
import { LevelBadge, LevelProgress } from './XpBar.jsx';
import QuestBoard from './QuestBoard.jsx';
import { initials } from '../utils/format.js';

export default function PlayerCard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);

  // Reload stats when the player's XP changes
  useEffect(() => {
    if (!user) { setProfile(null); return; }
    let cancelled = false;
    getUserProfile(user._id)
      .then(({ data }) => { if (!cancelled) setProfile(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?._id, user?.reputation]);

  if (!user) {
    return (
      <div className="sidebar-card player-card player-card--guest">
        <div className="player-card__press">PRESS START</div>
        <p>Log in to earn XP, level up and unlock badges.</p>
        <div className="player-card__actions">
          <Link to="/login" className="btn btn--small"><Gamepad2 size={14} /> Log in</Link>
          <Link to="/register" className="btn btn--ghost btn--small">New player</Link>
        </div>
      </div>
    );
  }

  const info = getLevelInfo(user.reputation || 0);

  return (
    <div className="sidebar-card player-card">
      <div className="player-card__top">
        <div className="avatar-hex avatar-hex--lg" aria-hidden="true">{initials(user.name)}</div>
        <div className="player-card__id">
          <Link to={`/users/${user._id}`} className="player-card__name">{user.name}</Link>
          <LevelBadge level={info.level} size="sm" />
        </div>
      </div>
      <LevelProgress xp={user.reputation || 0} />
      {profile && (
        <QuestBoard
          stats={profile.stats}
          xp={user.reputation || 0}
          earned={profile.user?.badges || []}
        />
      )}
    </div>
  );
}
