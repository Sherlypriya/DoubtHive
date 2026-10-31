import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import { loginUser } from '../api/authApi';
import { useAuth } from '../context/AuthContext.jsx';
import AuthLayout from '../components/AuthLayout.jsx';
import { apiErrorMessages } from '../utils/apiError.js';

function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';


  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);
    setSubmitting(true);
    try {
      const { data } = await loginUser(form);
      login(data);
      navigate(from, { replace: true });
    } catch (err) {
      setErrors(apiErrorMessages(err, 'Login failed. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="page page--narrow">
        <h2>Continue your run</h2>
        <p style={{ color: 'var(--ink-soft)', marginBottom: '1.5rem' }}>
          Log in to ask, answer, and keep your reputation growing.
        </p>

        <div className="card">
          {errors.length > 0 && (
            <div className="form-errors">
              <ul>
                {errors.map((msg, i) => <li key={i}>{msg}</li>)}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit} className="stack">
            <label className="form-field">
              Email
              <div className="input-icon-wrap">
                <Mail size={16} />
                <input
                  name="email"
                  type="email"
                  placeholder="you@college.edu"
                  value={form.email}
                  onChange={handleChange}
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

            <button type="submit" className="btn btn--full" disabled={submitting}>
              <LogIn size={16} /> {submitting ? 'Logging in...' : 'Log in'}
            </button>
          </form>
        </div>

        <p className="auth-switch">
          Don't have an account? <Link to="/register">Sign up</Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export default Login;
