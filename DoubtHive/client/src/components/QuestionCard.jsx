import { Link } from 'react-router-dom';
import { Eye, Zap } from 'lucide-react';
import { XP_REWARDS } from '../constants/game.js';
import { initials, timeAgo } from '../utils/format.js';

function QuestionCard({ q }) {
  const excerpt = q.description.replace(/```[\s\S]*?```/g, ' [code] ').replace(/\s+/g, ' ').trim();

  return (
    <Link to={`/questions/${q._id}`} className="question-card">
      <div className="avatar-hex" aria-hidden="true">{initials(q.userId?.name)}</div>

      <div className="question-card__body">
        <div className="question-card__top">
          <h3 className="question-card__title">{q.title}</h3>
          <span className={`badge badge--${q.status}`}>
            {q.status === 'resolved' ? 'Cleared' : 'Open quest'}
          </span>
        </div>

        <p className="question-card__excerpt">
          {excerpt.slice(0, 140)}{excerpt.length > 140 ? '...' : ''}
        </p>

        <div className="meta-row">
          <span>{q.subject}</span>
          <span className="meta-sep" />
          <span>{q.department}</span>
          {q.semester && (
            <>
              <span className="meta-sep" />
              <span>Sem {q.semester}</span>
            </>
          )}
          <span className="meta-sep" />
          <span>by {q.userId?.name || 'Unknown'}</span>
          <span className="meta-sep" />
          <span>{timeAgo(q.createdAt)}</span>
          <span className="meta-sep" />
          <span>{q.answersCount} answer{q.answersCount === 1 ? '' : 's'}</span>
          {q.status !== 'resolved' && (
            <>
              <span className="meta-sep" />
              <span className="reward-chip"><Zap size={11} /> +{XP_REWARDS.ACCEPTED_ANSWER} XP</span>
            </>
          )}
          {typeof q.views === 'number' && (
            <>
              <span className="meta-sep" />
              <span className="meta-views"><Eye size={12} /> {q.views}</span>
            </>
          )}
        </div>

        {q.tags?.length > 0 && (
          <div className="tag-row" style={{ marginTop: '0.55rem' }}>
            {q.tags.map((t) => <span key={t} className="tag">{t}</span>)}
          </div>
        )}
      </div>
    </Link>
  );
}

export function QuestionCardSkeleton() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton" style={{ width: 42, height: 42 }} />
      <div className="skeleton-card__body">
        <div className="skeleton" style={{ height: 16, width: '60%' }} />
        <div className="skeleton" style={{ height: 12, width: '95%' }} />
        <div className="skeleton" style={{ height: 12, width: '40%' }} />
      </div>
    </div>
  );
}

export default QuestionCard;
