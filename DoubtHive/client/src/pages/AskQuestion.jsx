import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lightbulb } from 'lucide-react';
import { createQuestion, getSimilarQuestions } from '../api/questionApi';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { SUBJECTS, DEPARTMENTS, SEMESTERS } from '../constants/options';

const DRAFT_KEY = 'doubthive-ask-draft';
const TITLE_MAX = 150;

const initialForm = {
  title: '',
  description: '',
  tagsInput: '',
  subject: SUBJECTS[0],
  department: DEPARTMENTS[0],
  semester: 1,
};

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? { ...initialForm, ...JSON.parse(raw) } : initialForm;
  } catch {
    return initialForm;
  }
}

function AskQuestion() {
  const [form, setForm] = useState(loadDraft);
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [similar, setSimilar] = useState([]);
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const restoredDraft = useRef(form !== initialForm);

  useEffect(() => {
    if (restoredDraft.current) {
      toast.info('Restored your unsent draft.');
    } else if (user?.department) {
      setForm((f) => ({
        ...f,
        department: user.department,
        semester: user.semester || f.semester || 1,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Auto-save the draft so a refresh or accidental navigation doesn't lose a long question
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (form.title || form.description || form.tagsInput) {
          localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
        }
      } catch { /* storage unavailable */ }
    }, 400);
    return () => clearTimeout(t);
  }, [form]);

  // "Already asked?" suggestions while the title is being typed
  useEffect(() => {
    const title = form.title.trim();
    if (title.length < 8) { setSimilar([]); return undefined; }

    let cancelled = false;
    const t = setTimeout(() => {
      getSimilarQuestions(title)
        .then(({ data }) => { if (!cancelled) setSimilar(data.questions); })
        .catch(() => {});
    }, 500);
    return () => { cancelled = true; clearTimeout(t); };
  }, [form.title]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const tags = form.tagsInput.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);

    if (!isAuthenticated) {
      setErrors(['You need to log in before asking a question.']);
      return;
    }
    if (form.title.trim().length < 5) {
      setErrors(['Title must be at least 5 characters.']);
      return;
    }
    if (form.description.trim().length < 10) {
      setErrors(['Description must be at least 10 characters.']);
      return;
    }

    setSubmitting(true);
    try {
      const payloadDept = user?.role === 'student' && user.department ? user.department : form.department;
      const payloadSem = user?.role === 'student' && user.semester ? user.semester : (Number(form.semester) || 1);

      const { data } = await createQuestion({
        title: form.title.trim(),
        description: form.description.trim(),
        tags,
        subject: form.subject,
        department: payloadDept,
        semester: payloadSem,
      });

      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      toast.success('Question posted');
      navigate(`/questions/${data.question._id}`);
    } catch (err) {
      const res = err.response?.data;
      setErrors(res?.errors || [res?.message || 'Failed to post question. Please try again.']);
    } finally {
      setSubmitting(false);
    }
  };

  const discardDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    setForm({ ...initialForm, department: user?.department && DEPARTMENTS.includes(user.department) ? user.department : initialForm.department });
    setSimilar([]);
  };

  return (
    <div className="page page--narrow" style={{ maxWidth: 560 }}>
      <h2>New quest</h2>
      <p style={{ color: 'var(--ink-soft)', marginBottom: '1.5rem' }}>
        The more detail you give, the faster someone can help.
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
            Title
            <input
              name="title"
              placeholder="Why does my recursive function stack overflow?"
              value={form.title}
              onChange={handleChange}
              maxLength={TITLE_MAX}
              required
            />
            <span className={`form-hint${form.title.length > TITLE_MAX - 20 ? ' form-hint--warn' : ''}`}>
              <span />
              <span>{form.title.length}/{TITLE_MAX}</span>
            </span>
          </label>

          {similar.length > 0 && (
            <div className="similar-box" role="note">
              <div className="similar-box__title"><Lightbulb size={15} /> Already asked? These might help</div>
              <ul>
                {similar.map((q) => (
                  <li key={q._id}>
                    <Link to={`/questions/${q._id}`} target="_blank" rel="noreferrer">{q.title}</Link>
                    <span className="similar-box__meta">
                      {q.status === 'resolved' ? 'Resolved' : 'Open'} · {q.answersCount} answer{q.answersCount === 1 ? '' : 's'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <label className="form-field">
            Description
            <textarea
              name="description"
              placeholder="Explain your doubt in detail — what have you tried, what's the error, etc."
              value={form.description}
              onChange={handleChange}
              rows={7}
              required
            />
            <span className="form-hint">
              <span>Tip: wrap code in ``` fences and use `backticks` for inline code.</span>
              <span>{form.description.trim().length} chars</span>
            </span>
          </label>

          <div className="form-row">
            <label className="form-field">
              Subject
              <select name="subject" value={form.subject} onChange={handleChange}>
                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>

            <label className="form-field">
              Department
              {user?.role === 'student' ? (
                <select name="department" value={user?.department || ''} disabled title="Locked to your registered department">
                  <option value={user?.department}>{user?.department} (Locked)</option>
                </select>
              ) : (
                <select name="department" value={form.department} onChange={handleChange}>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              )}
            </label>

            <label className="form-field">
              Semester
              {user?.role === 'student' ? (
                <select name="semester" value={user?.semester || 1} disabled title="Locked to your registered semester">
                  <option value={user?.semester || 1}>Semester {user?.semester || 1} (Locked)</option>
                </select>
              ) : (
                <select name="semester" value={form.semester} onChange={handleChange}>
                  {SEMESTERS.map((sem) => <option key={sem} value={sem}>Semester {sem}</option>)}
                </select>
              )}
            </label>
          </div>

          <label className="form-field">
            Tags <span style={{ fontWeight: 400 }}>(comma-separated)</span>
            <input
              name="tagsInput"
              placeholder="recursion, python, stack-overflow"
              value={form.tagsInput}
              onChange={handleChange}
            />
            {tags.length > 0 && (
              <span className="tag-row" style={{ marginTop: '0.2rem' }}>
                {[...new Set(tags)].map((t) => <span key={t} className="tag">{t}</span>)}
              </span>
            )}
          </label>

          <button type="submit" className="btn btn--full" disabled={submitting}>
            {submitting ? 'Posting...' : 'Post question'}
          </button>
          {(form.title || form.description || form.tagsInput) && (
            <button type="button" className="btn btn--ghost btn--small" onClick={discardDraft}>
              Discard draft
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

export default AskQuestion;
