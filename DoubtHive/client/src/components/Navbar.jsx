import { Link, useNavigate } from 'react-router-dom';
import { Award, Plus, LogOut, Bookmark, Sun, Moon, Gift, ShieldAlert, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import NotificationBell from './NotificationBell.jsx';
import { LevelBadge, XpBar } from './XpBar.jsx';
import { getLevelInfo } from '../constants/game.js';
import { initials } from '../utils/format.js';


function HexMark() {
  return (
    <svg className="nav__brand-mark" viewBox="0 0 30 30" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="hexg" x1="0" y1="0" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#22E4FF" />
          <stop offset="1" stopColor="#9A6BFF" />
        </linearGradient>
      </defs>
      <polygon points="15,1 27,8 27,22 15,29 3,22 3,8" stroke="url(#hexg)" strokeWidth="2" />
      <polygon points="15,8 21,11.5 21,18.5 15,22 9,18.5 9,11.5" fill="url(#hexg)" />
    </svg>
  );
}

function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const hud = getLevelInfo(user?.reputation || 0);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };


  return (
    <nav className="nav">
      <Link to="/" className="nav__brand">
        <HexMark />
        <span className="nav__brand-word">DoubtHive</span>
      </Link>

      <div className="nav__links">
        <Link to="/explore" title="Browse questions">
          <HelpCircle size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
          <span className="nav__label">Explore</span>
        </Link>

        <Link to="/leaderboard" title="Leaderboard">
          <Award size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
          <span className="nav__label">Ranks</span>
        </Link>

        <Link to="/perks" title="Rewards shop">
          <Gift size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
          <span className="nav__label">Perks</span>
        </Link>

        {user ? (
          <>
            <Link to="/saved" title="Saved questions">
              <Bookmark size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
              <span className="nav__label">Stash</span>
            </Link>
            <Link to="/ask" className="btn btn--small">
              <Plus size={14} /> <span className="nav__label">New Quest</span>
            </Link>
            <NotificationBell />
          </>
        ) : null}

        {/* Admin link — only visible to admin users */}
        {user?.role === 'admin' && (
          <Link to="/admin" title="Admin panel" style={{ color: 'var(--hot)' }}>
            <ShieldAlert size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
            <span className="nav__label">Admin</span>
          </Link>
        )}

        <button
          type="button"
          className="nav__icon-btn"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {user ? (
          <>
            <Link to={`/users/${user._id}`} className="hud" title={`Level ${hud.level} · ${hud.title} · ${user.reputation || 0} XP`}>
              <LevelBadge level={hud.level} size="sm" />
              <span className="hud__meta">
                <span className="hud__xp">{user.reputation || 0} XP</span>
                <XpBar progress={hud.progress} size="xs" />
              </span>
            </Link>
            <Link to={`/users/${user._id}`} className="nav__user">
              <span aria-hidden="true" className="nav__avatar">{initials(user.name)}</span>
              <span className="nav__label">{user.name}</span>
            </Link>
            <button className="btn btn--ghost btn--small nav__logout" onClick={handleLogout}>
              <LogOut size={14} /> <span className="nav__label">Logout</span>
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register" className="btn btn--small">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
