import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, X, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import RichText from './RichText.jsx';
import MediaPicker from './MediaPicker.jsx';
import AttachmentGallery from './AttachmentGallery.jsx';
import { initials, timeAgo } from '../utils/format.js';
import {
  getAnswersForQuestion,
  createAnswer,
  acceptAnswer,
  deleteAnswer,
  voteAnswer,
  updateAnswer,
} from '../api/answerApi';

function VoteControl({ answer, isAuthenticated, isOwnAnswer, onVote, busy }) {
  const score = (answer.upvotes || 0) - (answer.downvotes || 0);

  return (
    <div className="vote">
      <button
        type="button"
        className={`vote__btn vote__btn--up${answer.myVote === 1 ? ' vote__btn--active' : ''}`}
        onClick={() => onVote(1)}
        disabled={!isAuthenticated || isOwnAnswer || busy}
        title={isOwnAnswer ? "You can't vote on your own answer" : 'Upvote'}
        aria-label="Upvote"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 5l7 8h-5v6h-4v-6H5l7-8z" fill="currentColor" />
        </svg>
      </button>

      <span className="vote__score">{score}</span>

      <button
        type="button"
        className={`vote__btn vote__btn--down${answer.myVote === -1 ? ' vote__btn--active' : ''}`}
        onClick={() => onVote(-1)}
        disabled={!isAuthenticated || isOwnAnswer || busy}
        title={isOwnAnswer ? "You can't vote on your own answer" : 'Downvote'}
        aria-label="Downvote"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 19l-7-8h5V5h4v6h5l-7 8z" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}

const EMPTY_MEDIA = { files: [], links: [] };

// Shared by the post form and the edit form.
// Returns an error message, or '' when the answer is acceptable.
const answerProblem = (text, attachmentCount) => {
  if (!text) return attachmentCount ? '' : 'Write an answer or attach a picture or video.';
  return text.length < 2 ? 'Answer must be at least 2 characters.' : '';
};

function UploadProgress({ pct }) {
  if (pct === null) return null;
  return (
    <div className="media-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div className="media-progress__bar" style={{ width: `${pct}%` }} />
      <span>{pct < 100 ? `Uploading… ${pct}%` : 'Processing…'}</span>
    </div>
  );
}

function AnswerSection({ questionId, questionOwnerId, onQuestionStatusChange }) {
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();

  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [media, setMedia] = useState(EMPTY_MEDIA);
  const [uploadPct, setUploadPct] = useState(null);

  const [busyAnswerId, setBusyAnswerId] = useState(null);
  const [sortMode, setSortMode] = useState('top'); // 'top' | 'newest'

  // Inline edit state
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');
  const [editMedia, setEditMedia] = useState(EMPTY_MEDIA);
  const [removedIds, setRemovedIds] = useState(() => new Set());
  const [editPct, setEditPct] = useState(null);

  // Faculty (and admins) can add lecture videos; students can add pictures.
  const canUploadVideo = user?.role === 'faculty' || user?.role === 'admin';

  const fetchAnswers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await getAnswersForQuestion(questionId);
      setAnswers(data.answers);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load answers');
    } finally {
      setLoading(false);
    }
  }, [questionId]);

  useEffect(() => { fetchAnswers(); }, [fetchAnswers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!isAuthenticated) {
      setFormError('You need to log in to post an answer.');
      return;
    }
    const text = content.trim();
    const hasMedia = media.files.length + media.links.length;
    const problem = answerProblem(text, hasMedia);
    if (problem) {
      setFormError(problem);
      return;
    }

    setSubmitting(true);
    setUploadPct(media.files.length ? 0 : null);
    try {
      const { data } = await createAnswer(questionId, text, media, setUploadPct);
      setAnswers((prev) => [data.answer, ...prev]);
      setContent('');
      setMedia(EMPTY_MEDIA);
      toast.success('Answer posted');
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
          (err.request ? 'Upload failed — check your connection and try again.' : 'Failed to post answer.')
      );
    } finally {
      setSubmitting(false);
      setUploadPct(null);
    }
  };

  const handleAccept = async (answerId) => {
    setBusyAnswerId(answerId);
    try {
      await acceptAnswer(answerId);
      await fetchAnswers();
      onQuestionStatusChange?.('resolved');
      toast.success('Answer accepted. The author earned reputation.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept answer.');
    } finally {
      setBusyAnswerId(null);
    }
  };

  const handleDelete = async (answer) => {
    if (!window.confirm('Delete this answer?')) return;
    setBusyAnswerId(answer._id);
    try {
      await deleteAnswer(answer._id);
      setAnswers((prev) => prev.filter((a) => a._id !== answer._id));
      if (answer.isAccepted) onQuestionStatusChange?.('open');
      toast.success('Answer deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete answer.');
    } finally {
      setBusyAnswerId(null);
    }
  };

  const handleVote = async (answerId, value) => {
    setBusyAnswerId(answerId);
    try {
      const { data } = await voteAnswer(answerId, value);
      setAnswers((prev) => prev.map((a) => (a._id === answerId ? data.answer : a)));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to register your vote.');
    } finally {
      setBusyAnswerId(null);
    }
  };

  const startEdit = (answer) => {
    setEditingId(answer._id);
    setEditContent(answer.content);
    setEditError('');
    setEditMedia(EMPTY_MEDIA);
    setRemovedIds(new Set());
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
    setEditError('');
    setEditMedia(EMPTY_MEDIA);
    setRemovedIds(new Set());
  };

  const toggleRemoved = (attachmentId) =>
    setRemovedIds((prev) => {
      const next = new Set(prev);
      if (next.has(attachmentId)) next.delete(attachmentId);
      else next.add(attachmentId);
      return next;
    });

  const handleEditSave = async (answer) => {
    setEditError('');
    const text = editContent.trim();
    const remaining = (answer.attachments?.length || 0) - removedIds.size;
    const problem = answerProblem(text, remaining + editMedia.files.length + editMedia.links.length);
    if (problem) {
      setEditError(problem);
      return;
    }
    setEditSubmitting(true);
    setEditPct(editMedia.files.length ? 0 : null);
    try {
      const { data } = await updateAnswer(
        answer._id,
        text,
        { ...editMedia, removeIds: [...removedIds] },
        setEditPct
      );
      setAnswers((prev) => prev.map((a) => (a._id === answer._id ? data.answer : a)));
      cancelEdit();
      toast.success('Answer updated');
    } catch (err) {
      setEditError(
        err.response?.data?.message ||
          (err.request ? 'Upload failed — check your connection and try again.' : 'Failed to update answer.')
      );
    } finally {
      setEditSubmitting(false);
      setEditPct(null);
    }
  };

  const isQuestionOwner = user?._id === questionOwnerId;

  // The accepted answer always stays on top; the rest follow the chosen order.
  const visibleAnswers = [...answers].sort((a, b) => {
    if (a.isAccepted !== b.isAccepted) return a.isAccepted ? -1 : 1;
    if (sortMode === 'top') {
      const diff = (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes);
      if (diff !== 0) return diff;
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return (
    <div className="answer-section">
      <div className="answer-section__head">
        <h3 style={{ margin: 0 }}>{answers.length} Answer{answers.length === 1 ? '' : 's'}</h3>
        {answers.length > 1 && (
          <div className="segmented" role="group" aria-label="Sort answers">
            <button type="button" aria-pressed={sortMode === 'top'} onClick={() => setSortMode('top')}>Top voted</button>
            <button type="button" aria-pressed={sortMode === 'newest'} onClick={() => setSortMode('newest')}>Newest</button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="answer-form">
        {formError && (
          <div className="form-errors">
            <ul><li>{formError}</li></ul>
          </div>
        )}
        <textarea
          placeholder={
            !isAuthenticated
              ? 'Log in to write an answer'
              : canUploadVideo
                ? 'Write your answer, or attach a lecture video / pictures below. Wrap code in ``` fences.'
                : 'Write your answer... Wrap code in ``` fences for formatting. You can add pictures too.'
          }
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          disabled={!isAuthenticated}
        />
        {isAuthenticated && (
          <MediaPicker
            value={media}
            onChange={setMedia}
            canUploadVideo={canUploadVideo}
            disabled={submitting}
            onReject={toast.error}
          />
        )}
        <UploadProgress pct={uploadPct} />
        <button type="submit" className="btn" disabled={submitting || !isAuthenticated}>
          {submitting ? (uploadPct !== null && uploadPct < 100 ? `Uploading ${uploadPct}%` : 'Posting...') : 'Post answer'}
        </button>
      </form>

      {loading && <p>Loading answers...</p>}
      {error && <p style={{ color: 'var(--rust)' }}>{error}</p>}
      {!loading && !error && answers.length === 0 && (
        <div className="empty-state">No answers yet — be the first to help out.</div>
      )}

      <div className="answer-list">
        {visibleAnswers.map((answer) => {
          const isAnswerOwner = user?._id === answer.userId?._id;
          const isBusy = busyAnswerId === answer._id;
          const isEditing = editingId === answer._id;

          return (
            <div key={answer._id} className={`answer${answer.isAccepted ? ' answer--accepted' : ''}`}>
              <div className="answer__header">
                <VoteControl
                  answer={answer}
                  isAuthenticated={isAuthenticated}
                  isOwnAnswer={isAnswerOwner}
                  busy={isBusy}
                  onVote={(value) => handleVote(answer._id, value)}
                />

                <div className="avatar-hex avatar-hex--sm" aria-hidden="true">
                  {initials(answer.userId?.name)}
                </div>

                <div style={{ flex: 1 }}>
                  <div className="answer__meta">
                    {answer.userId?._id ? (
                      <Link to={`/users/${answer.userId._id}`} className="author-link">
                        {answer.userId.name}
                      </Link>
                    ) : (
                      <span className="answer__name">Unknown</span>
                    )}
                    {answer.isFacultyAnswer && <span className="badge badge--faculty">Faculty</span>}
                    {answer.isAccepted && <span className="badge badge--accepted">Accepted</span>}
                    <span className="meta-sep" />
                    <span style={{ color: 'var(--ink-faint)' }} title={new Date(answer.createdAt).toLocaleString()}>
                      {timeAgo(answer.createdAt)}
                    </span>
                  </div>

                  {/* Inline edit form */}
                  {isEditing ? (
                    <div className="answer-edit-form">
                      {editError && (
                        <div className="form-errors" style={{ marginBottom: '0.5rem' }}>
                          <ul><li>{editError}</li></ul>
                        </div>
                      )}
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={5}
                        style={{ width: '100%', marginBottom: '0.5rem' }}
                      />
                      <AttachmentGallery
                        attachments={answer.attachments}
                        edit={{ removedIds, onToggle: toggleRemoved }}
                      />
                      <MediaPicker
                        value={editMedia}
                        onChange={setEditMedia}
                        canUploadVideo={canUploadVideo}
                        existingCount={(answer.attachments?.length || 0) - removedIds.size}
                        disabled={editSubmitting}
                        onReject={toast.error}
                      />
                      <UploadProgress pct={editPct} />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          className="btn btn--small"
                          disabled={editSubmitting}
                          onClick={() => handleEditSave(answer)}
                        >
                          <Check size={13} /> {editSubmitting ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--small"
                          onClick={cancelEdit}
                        >
                          <X size={13} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {answer.content && <RichText text={answer.content} className="answer__content" />}
                      <AttachmentGallery attachments={answer.attachments} />
                    </>
                  )}

                  <div className="answer__actions">
                    {isQuestionOwner && !answer.isAccepted && (
                      <button className="btn btn--small" onClick={() => handleAccept(answer._id)} disabled={isBusy}>
                        {isBusy ? 'Accepting...' : 'Accept'}
                      </button>
                    )}
                    {isAnswerOwner && !isEditing && (
                      <button
                        className="btn btn--ghost btn--small"
                        onClick={() => startEdit(answer)}
                        disabled={isBusy}
                      >
                        <Pencil size={13} /> Edit
                      </button>
                    )}
                    {isAnswerOwner && (
                      <button
                        className="btn btn--danger btn--small"
                        onClick={() => handleDelete(answer)}
                        disabled={isBusy}
                      >
                        {isBusy ? 'Deleting...' : 'Delete'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AnswerSection;
