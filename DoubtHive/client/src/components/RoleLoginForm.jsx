import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import { loginUser } from '../api/authApi';
import { useAuth } from '../context/AuthContext.jsx';
import { apiErrorMessages } from '../utils/apiError.js';

/**
 * Shared login form used by Student, Faculty, and Admin login pages.
 *
 * Props:
 *   role         — 'student' | 'faculty' | 'admin'
 *   accentColor  — CSS color string for the submit button gradient start
 *   accentColor2 — CSS color string for the submit button gradient end
 *   heading      — e.g. "Student Portal"
 *   subheading   — e.g. "Ask, learn, and earn XP"
 *   icon         — React element (Lucide icon)
 *   otherRoles   — array of { label, path } for the "wrong portal?" links
 *   redirectTo   — path to navigate to on success (default '/')
 */
function RoleLoginForm({
  role,
  accentColor,
  accentColor2,
  heading,
  subheading,
  icon: RoleIcon,
  otherRoles = [],
  redirectTo = '/',
}) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Honour the ?from redirect but override with our role-specific destination
  const from = location.state?.from?.pathname || redirectTo;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);

    if (!form.email.trim()) { setErrors(['Email is required']); return; }
    if (!form.password)     { setErrors(['Password is required']); return; }

    setSubmitting(true);
    try {
      const { data } = await loginUser(form);

      // ── Role gate ───────────────────────────────────────────────────────
      // The backend returns the user object with their actual role.
      // If it doesn't match the login portal the user chose, we MUST NOT
      // store the session — reject immediately with a clear message.
      if (data.user.role !== role) {
        // Do not call login() — no token gets persisted.
        const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
        const actualLabel = data.user.role.charAt(0).toUpperCase() + data.user.role.slice(1);
        setErrors([
          `This account is registered as a ${actualLabel}, not a ${roleLabel}. ` +
          `Please use the ${actualLabel} portal instead.`,
        ]);
        return;
      }
      // ── Role matches — create authenticated session ──────────────────────
      login(data);
      navigate(from.startsWith('/admin') && role !== 'admin' ? redirectTo : from, { replace: true });
    } catch (err) {
      setErrors(apiErrorMessages(err, 'Login failed. Check your credentials.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="role-login-page" style={{ '--rl-c1': accentColor, '--rl-c2': accentColor2 }}>
      <div className="role-login-page__inner">

        {/* ── Brand strip ─────────────────────────────────────────────── */}
        <Link to="/login" className="role-login-page__back">
          ← Back to role selection
        </Link>

        <div className="role-login-page__brand">
          <div className="role-login-page__role-icon">
            {RoleIcon && <RoleIcon size={26} />}
          </div>
          <div>
            <div className="role-login-page__brand-name">DoubtHive</div>
            <div className="role-login-page__heading">{heading}</div>
          </div>
        </div>

        <p className="role-login-page__sub">{subheading}</p>

        {/* ── Card ────────────────────────────────────────────────────── */}
        <div className="card role-login-card">
          {errors.length > 0 && (
            <div className="form-errors" role="alert">
              <ul>{errors.map((msg, i) => <li key={i}>{msg}</li>)}</ul>
            </div>
          )}

          <form onSubmit={handleSubmit} className="stack" noValidate>
            <label className="form-field">
              Email address
              <div className="input-icon-wrap">
                <Mail size={16} />
                <input
                  name="email"
                  type="email"
                  placeholder="you@college.edu"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                  required
                />
              </div>
            </label>

            <label className="form-field">
              Password
              <div className="input-icon-wrap">
                <Lock size={16} />
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="input-icon-toggle"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              className="btn btn--full role-login-btn"
              disabled={submitting}
            >
              <LogIn size={16} />
              {submitting ? 'Verifying…' : `Sign in as ${heading.replace(' Portal', '')}`}
            </button>
          </form>
        </div>

        {/* ── Other portals ────────────────────────────────────────────── */}
        {otherRoles.length > 0 && (
          <div className="role-login-page__other">
            <span>Wrong portal?</span>
            {otherRoles.map(({ label, path }) => (
              <Link key={path} to={path}>{label} portal →</Link>
            ))}
          </div>
        )}

        <p className="auth-switch">
          {role === 'student'
            ? <>New student? <Link to="/register">Create an account</Link></>
            : <>Not registered yet? <Link to="/register">Sign up</Link></>}
        </p>
      </div>
    </div>
  );
}

export default RoleLoginForm;
