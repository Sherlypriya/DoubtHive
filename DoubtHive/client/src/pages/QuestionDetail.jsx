import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Bookmark, BookmarkCheck, Link2, Eye, Pencil, X, Check } from 'lucide-react';
import {
  getQuestionById, deleteQuestion, toggleBookmark, recordView, updateQuestion,
} from '../api/questionApi';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import AnswerSection from '../components/AnswerSection.jsx';
import RichText from '../components/RichText.jsx';
import { initials, timeAgo } from '../utils/format.js';
import { SUBJECTS, DEPARTMENTS } from '../constants/options.js';

function QuestionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();

  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);

  // Inline edit state
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '', tags: '', subject: '', department: '' });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const fetchQuestion = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await getQuestionById(id);
        if (cancelled) return;
        setQuestion(data.question);
        setBookmarked(!!data.question.isBookmarked);

        // Count a view once per browser session per question
        const key = `viewed:${id}`;
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, '1');
          recordView(id)
            .then(({ data: v }) => {
              if (!cancelled) setQuestion((q) => (q ? { ...q, views: v.views } : q));
            })
            .catch(() => {});
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load this question');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchQuestion();
    return () => { cancelled = true; };
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Delete this question and all its answers? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteQuestion(id);
      toast.success('Question deleted');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete question');
    } finally {
      setDeleting(false);
    }
  };

  const handleBookmark = async () => {
    if (!isAuthenticated) {
      toast.info('Log in to save questions.');
      return;
    }
    setBookmarkBusy(true);
    try {
      const { data } = await toggleBookmark(id);
      setBookmarked(data.bookmarked);
      toast.success(data.bookmarked ? 'Saved to your list' : 'Removed from saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update your saved list');
    } finally {
      setBookmarkBusy(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy the link');
    }
  };

  const startEdit = () => {
    setEditForm({
      title: question.title,
      description: question.description,
      tags: question.tags?.join(', ') || '',
      subject: question.subject || '',
      department: question.department || '',
    });
    setEditError('');
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditError('');
  };

  const handleEditSave = async () => {
    setEditError('');
    if (!editForm.title.trim()) { setEditError('Title is required'); return; }
    if (!editForm.description.trim()) { setEditError('Description is required'); return; }

    setEditSubmitting(true);
    try {
      const tags = editForm.tags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      const { data } = await updateQuestion(id, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        tags,
        subject: editForm.subject,
        department: editForm.department,
      });
      setQuestion(data.question);
      setEditing(false);
      toast.success('Question updated');
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update question');
    } finally {
      setEditSubmitting(false);
    }
  };

  if (loading) return <div className="page"><p>Loading...</p></div>;
  if (error) {
    return (
      <div className="page page--narrow" style={{ marginTop: '2rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ marginBottom: '0.75rem' }}>Department Restricted</h2>
          <p style={{ color: 'var(--ink-soft)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            {error}
          </p>
          <Link to="/explore" className="btn">
            Back to your Department Doubts
          </Link>
        </div>
      </div>
    );
  }
  if (!question) return null;

  const isOwner = user?._id === question.userId?._id;

  return (
    <div className="page">
      <Link to="/explore" className="back-link">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to feed
      </Link>

      <div className="card">
        <div className="question-detail__header">
          <div className="avatar-hex" aria-hidden="true">{initials(question.userId?.name)}</div>
          <div style={{ flex: 1 }}>
            {editing ? (
              /* ─── Edit form ─────────────────────────────────────────────────── */
              <div className="question-edit-form">
                {editError && (
                  <div className="form-errors" style={{ marginBottom: '0.75rem' }}>
                    <ul><li>{editError}</li></ul>
                  </div>
                )}
                <label className="form-field">
                  Title
                  <input
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    maxLength={200}
                  />
                </label>
                <label className="form-field">
                  Description
                  <textarea
                    rows={8}
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  />
                </label>
                <div className="form-row">
                  <label className="form-field">
                    Subject
                    <select value={editForm.subject} onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}>
                      {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                  <label className="form-field">
                    Department
                    <select value={editForm.department} onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}>
                      {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </label>
                </div>
                <label className="form-field">
                  Tags (comma-separated)
                  <input
                    value={editForm.tags}
                    onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                    placeholder="e.g. recursion, python, algorithms"
                  />
                </label>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn--small"
                    onClick={handleEditSave}
                    disabled={editSubmitting}
                  >
                    <Check size={14} /> {editSubmitting ? 'Saving…' : 'Save changes'}
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    onClick={cancelEdit}
                  >
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* ─── Read view ─────────────────────────────────────────────────── */
              <>
                <h1 style={{ marginBottom: '0.2rem' }}>{question.title}</h1>
                <div className="question-detail__meta">
                  <span>
                    Asked by{' '}
                    {question.userId?._id ? (
                      <Link to={`/users/${question.userId._id}`} className="author-link">
                        {question.userId.name}
                      </Link>
                    ) : (
                      'Unknown'
                    )}
                    {question.userId?.role === 'faculty' && (
                      <span className="badge badge--faculty" style={{ marginLeft: '0.4rem' }}>Faculty</span>
                    )}
                  </span>
                  <span className="meta-sep" />
                  <span title={new Date(question.createdAt).toLocaleString()}>{timeAgo(question.createdAt)}</span>
                  <span className="meta-sep" />
                  <span className="meta-views"><Eye size={13} /> {question.views || 0} view{question.views === 1 ? '' : 's'}</span>
                </div>
              </>
            )}
          </div>
          {!editing && (
            <span className={`badge badge--${question.status}`}>
              {question.status === 'resolved' ? 'Resolved' : 'Open'}
            </span>
          )}
        </div>

        {!editing && (
          <>
            <RichText text={question.description} className="question-detail__desc" />

            <div className="tag-row" style={{ margin: '1.1rem 0' }}>
              <span className="tag">{question.subject}</span>
              <span className="tag">{question.department}</span>
              {question.semester && <span className="tag">Sem {question.semester}</span>}
              {question.tags?.map((t) => <span key={t} className="tag">{t}</span>)}
            </div>
          </>
        )}

        <div className="question-actions">
          <button
            type="button"
            onClick={handleBookmark}
            disabled={bookmarkBusy}
            className={`btn btn--ghost btn--small${bookmarked ? ' bookmark-btn--on' : ''}`}
            aria-pressed={bookmarked}
          >
            {bookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
            {bookmarked ? 'Saved' : 'Save'}
          </button>
          <button type="button" onClick={handleCopyLink} className="btn btn--ghost btn--small">
            <Link2 size={14} /> Copy link
          </button>
          {isOwner && !editing && (
            <button type="button" onClick={startEdit} className="btn btn--ghost btn--small">
              <Pencil size={14} /> Edit
            </button>
          )}
          {isOwner && !editing && (
            <button onClick={handleDelete} disabled={deleting} className="btn btn--danger btn--small">
              {deleting ? 'Deleting...' : 'Delete question'}
            </button>
          )}
        </div>
      </div>

      <AnswerSection
        questionId={question._id}
        questionOwnerId={question.userId?._id}
        onQuestionStatusChange={(status) => setQuestion((q) => (q ? { ...q, status } : q))}
      />
    </div>
  );
}

export default QuestionDetail;
