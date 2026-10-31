import { Link } from 'react-router-dom';
import { GraduationCap, BookOpen, ShieldAlert, ArrowRight } from 'lucide-react';

// Hex logo mark — reused from Navbar
function HexMark({ color1 = '#22E4FF', color2 = '#9A6BFF', size = 42 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={`rsg-${color1.slice(1)}`} x1="0" y1="0" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={color1} />
          <stop offset="1" stopColor={color2} />
        </linearGradient>
      </defs>
      <polygon points="15,1 27,8 27,22 15,29 3,22 3,8"
        stroke={`url(#rsg-${color1.slice(1)})`} strokeWidth="2" />
      <polygon points="15,8 21,11.5 21,18.5 15,22 9,18.5 9,11.5"
        fill={`url(#rsg-${color1.slice(1)})`} />
    </svg>
  );
}

const ROLES = [
  {
    key: 'student',
    path: '/student-login',
    icon: GraduationCap,
    label: 'Student',
    tagline: 'Ask doubts, earn XP & level up',
    color1: '#22e4ff',
    color2: '#5b8cff',
    accentVar: 'var(--accent)',
    borderColor: 'rgba(34,228,255,0.4)',
    bgColor: 'rgba(34,228,255,0.06)',
  },
  {
    key: 'faculty',
    path: '/faculty-login',
    icon: BookOpen,
    label: 'Faculty',
    tagline: 'Guide students & share expertise',
    color1: '#9a6bff',
    color2: '#ff3d9a',
    accentVar: 'var(--violet)',
    borderColor: 'rgba(154,107,255,0.4)',
    bgColor: 'rgba(154,107,255,0.06)',
  },
  {
    key: 'admin',
    path: '/admin-login',
    icon: ShieldAlert,
    label: 'Admin',
    tagline: 'Manage platform & moderate content',
    color1: '#ff3d9a',
    color2: '#ffc83d',
    accentVar: 'var(--hot)',
    borderColor: 'rgba(255,61,154,0.4)',
    bgColor: 'rgba(255,61,154,0.06)',
  },
];

function RoleSelect() {
  return (
    <div className="role-select-page">
      {/* Background aurora glows */}
      <div className="role-select-page__aurora" aria-hidden="true" />

      <div className="role-select-page__inner">
        {/* Logo */}
        <div className="role-select-page__brand">
          <HexMark size={48} />
          <span className="role-select-page__brand-name">DoubtHive</span>
        </div>

        <h1 className="role-select-page__heading">Who are you?</h1>
        <p className="role-select-page__sub">
          Choose your role to continue. Each portal is secured by role verification.
        </p>

        {/* Role cards */}
        <div className="role-cards">
          {ROLES.map(({ key, path, icon: Icon, label, tagline, color1, color2, borderColor, bgColor }) => (
            <Link
              key={key}
              to={path}
              className="role-card"
              style={{ '--role-border': borderColor, '--role-bg': bgColor, '--role-c1': color1, '--role-c2': color2 }}
            >
              <div className="role-card__icon-wrap">
                <Icon size={28} />
              </div>
              <div className="role-card__text">
                <div className="role-card__label">{label}</div>
                <div className="role-card__tagline">{tagline}</div>
              </div>
              <ArrowRight size={18} className="role-card__arrow" />
            </Link>
          ))}
        </div>

        <p className="role-select-page__footer">
          New to DoubtHive?{' '}
          <Link to="/register">Create a student account</Link>
        </p>
      </div>
    </div>
  );
}

export default RoleSelect;
