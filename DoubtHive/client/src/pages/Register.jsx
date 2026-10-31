import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, Building2, GraduationCap, UserPlus } from 'lucide-react';
import { registerUser } from '../api/authApi';
import { useAuth } from '../context/AuthContext.jsx';
import AuthLayout from '../components/AuthLayout.jsx';
import { apiErrorMessages } from '../utils/apiError.js';

import { DEPARTMENTS, SEMESTERS } from '../constants/options';

const initialForm = {
  name: '',
  email: '',
  password: '',
  role: 'student',
  department: 'Computer Science',
  semester: '1',
};

function Register() {
  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (payload.role !== 'student') {
        delete payload.semester;
      } else {
        if (!payload.department) {
          setErrors(['Please select your department.']);
          setSubmitting(false);
          return;
        }
        if (!payload.semester) {
          setErrors(['Please select your semester.']);
          setSubmitting(false);
          return;
        }
        payload.semester = Number(payload.semester);
      }

      const { data } = await registerUser(payload);
      login(data);
      navigate('/explore');
    } catch (err) {
      setErrors(apiErrorMessages(err, 'Registration failed. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="page page--narrow">
        <h2>Create your player</h2>
        <p style={{ color: 'var(--ink-soft)', marginBottom: '1.5rem' }}>
          Ask doubts, help others, and build your reputation on campus.
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
              Full name
              <div className="input-icon-wrap">
                <User size={16} />
                <input name="name" placeholder="Priya Sharma" value={form.name} onChange={handleChange} required />
              </div>
            </label>

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
                  placeholder="At least 6 characters"
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

            <div className="form-row">
              <label className="form-field">
                Role
                <select name="role" value={form.role} onChange={handleChange}>
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                  <option value="admin">Admin</option>
                </select>
              </label>

              <label className="form-field">
                Department
                <div className="input-icon-wrap">
                  <Building2 size={16} />
                  <select
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                    required={form.role === 'student'}
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
            </div>

            {form.role === 'student' && (
              <label className="form-field">
                Semester
                <div className="input-icon-wrap">
                  <GraduationCap size={16} />
                  <select
                    name="semester"
                    value={form.semester}
                    onChange={handleChange}
                    required
                  >
                    {SEMESTERS.map((sem) => (
                      <option key={sem} value={sem}>
                        Semester {sem}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
            )}

            {form.role === 'student' && (
              <div
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--ink-soft)',
                  background: 'var(--accent-dim, rgba(56, 189, 248, 0.08))',
                  border: '1px solid var(--accent, rgba(56, 189, 248, 0.3))',
                  borderRadius: 'var(--radius, 8px)',
                  padding: '0.65rem 0.85rem',
                  lineHeight: 1.45,
                }}
              >
                🔒 <strong>Department Access:</strong> As a student, your feed and doubts are dedicated to your selected <strong>Department</strong> and <strong>Semester</strong>.
              </div>
            )}

            <button type="submit" className="btn btn--full" disabled={submitting}>
              <UserPlus size={16} /> {submitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export default Register;
