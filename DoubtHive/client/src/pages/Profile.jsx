import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Award, HelpCircle, MessageCircle, Trophy } from 'lucide-react';
import { getUserProfile } from '../api/userApi';
import { BadgeGrid } from '../components/BadgeList.jsx';
import { LevelBadge, LevelProgress } from '../components/XpBar.jsx';
import { getLevelInfo } from '../constants/game.js';
import { BADGE_IDS } from '../constants/badges.js';
import { initials, timeAgo } from '../utils/format.js';

function Profile() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    getUserProfile(id)
      .then(({ data }) => { if (!cancelled) setData(data); })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load this profile');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <div className="page">Loading...</div>;
  if (error) return <div className="page" style={{ color: 'var(--rust)' }}>{error}</div>;
  if (!data) return null;

  const { user, stats, questions, answers } = data;
  const lvl = getLevelInfo(user.reputation || 0);

  return (
    <div className="page">
      <div className="profile-header">
        <div className="avatar-hex avatar-hex--lg" aria-hidden="true">{initials(user.name)}</div>
        <div>
          <div className="profile-header__name">
            <h1 style={{ margin: 0 }}>{user.name}</h1>
            {user.role === 'faculty' && <span className="badge badge--faculty">Faculty</span>}
          </div>
          <div className="profile-header__sub">
            {user.department || 'No department set'}
            {user.semester ? ` · Semester ${user.semester}` : ''}
          </div>
          <div className="profile-meta">
            Member since {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      <div className="hero-card">
        <LevelBadge level={lvl.level} size="xl" />
        <div className="hero-card__body">
          <div className="hero-card__kicker">PLAYER LEVEL {lvl.level}</div>
          <div className="hero-card__title">{lvl.title}</div>
          <LevelProgress xp={user.reputation || 0} />
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <Trophy size={18} style={{ color: 'var(--honey-dark)', marginBottom: '0.3rem' }} />
          <div className="stat-card__value">#{stats.rank}</div>
          <div className="stat-card__label">Global rank</div>
        </div>
        <div className="stat-card">
          <Award size={18} style={{ color: 'var(--honey-dark)', marginBottom: '0.3rem' }} />
          <div className="stat-card__value">{user.reputation}</div>
          <div className="stat-card__label">Total XP</div>
        </div>
        <div className="stat-card">
          <HelpCircle size={18} style={{ color: 'var(--honey-dark)', marginBottom: '0.3rem' }} />
          <div className="stat-card__value">{stats.questionsCount}</div>
          <div className="stat-card__label">Questions asked</div>
        </div>
        <div className="stat-card">
          <MessageCircle size={18} style={{ color: 'var(--honey-dark)', marginBottom: '0.3rem' }} />
          <div className="stat-card__value">{stats.answersCount}</div>
          <div className="stat-card__label">
            Answers given{stats.acceptedAnswersCount > 0 ? ` (${stats.acceptedAnswersCount} accepted)` : ''}
          </div>
        </div>
      </div>

      <div className="profile-section">
        <h3>Achievements <span style={{ fontWeight: 400, fontSize: '0.85rem', color: 'var(--ink-faint)' }}>
          {(user.badges || []).length}/{BADGE_IDS.length} unlocked
        </span></h3>
        <BadgeGrid earned={user.badges || []} />
      </div>

      <div className="profile-section">
        <h3>Recent questions</h3>
        {questions.length === 0 && <div className="empty-state">No questions asked yet.</div>}
        {questions.map((q) => (
          <Link key={q._id} to={`/questions/${q._id}`} className="profile-list-item">
            <div className="profile-list-item__title">{q.title}</div>
            <div className="meta-row">
              <span>{q.subject}</span>
              <span className="meta-sep" />
              <span>{timeAgo(q.createdAt)}</span>
              <span className="meta-sep" />
              <span className={`badge badge--${q.status}`}>
                {q.status === 'resolved' ? 'Resolved' : 'Open'}
              </span>
              <span className="meta-sep" />
              <span>{q.answersCount} answer{q.answersCount === 1 ? '' : 's'}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="profile-section">
        <h3>Recent answers</h3>
        {answers.length === 0 && <div className="empty-state">No answers given yet.</div>}
        {answers.map((a) => (
          <Link
            key={a._id}
            to={a.questionId?._id ? `/questions/${a.questionId._id}` : '/'}
            className="profile-list-item"
          >
            <div className="profile-list-item__title">
              On: {a.questionId?.title || 'Deleted question'}
            </div>
            <p style={{ margin: '0.3rem 0', color: 'var(--ink-soft)' }}>
              {a.content
                ? `${a.content.slice(0, 120)}${a.content.length > 120 ? '...' : ''}`
                : `Shared ${a.attachments?.some((x) => x.kind !== 'image') ? 'a lecture video' : 'a picture'}`}
            </p>
            <div className="meta-row">
              {a.isAccepted && <span className="badge badge--accepted">Accepted</span>}
              <span>{(a.upvotes || 0) - (a.downvotes || 0)} net votes</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Profile;
