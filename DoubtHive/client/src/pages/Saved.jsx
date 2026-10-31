import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import { getSavedQuestions } from '../api/questionApi';
import { useAuth } from '../context/AuthContext.jsx';
import QuestionCard, { QuestionCardSkeleton } from '../components/QuestionCard.jsx';

function Saved() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { setLoading(false); return; }

    let cancelled = false;
    getSavedQuestions()
      .then(({ data }) => { if (!cancelled) setQuestions(data.questions); })
      .catch((err) => { if (!cancelled) setError(err.response?.data?.message || 'Failed to load saved questions'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isAuthenticated, authLoading]);

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="page">
        <div className="empty-state">
          <p style={{ marginBottom: '0.75rem' }}>Log in to see the questions you've saved.</p>
          <Link to="/login" className="btn btn--small">Log in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Saved questions</h1>
          <p>Doubts you've bookmarked to come back to.</p>
        </div>
      </div>

      {error && <p style={{ color: 'var(--rust)' }}>{error}</p>}

      {!loading && !error && questions.length === 0 && (
        <div className="empty-state">
          <Bookmark size={22} style={{ color: 'var(--honey-dark)', marginBottom: '0.4rem' }} />
          <p style={{ marginBottom: '0.75rem' }}>Nothing saved yet. Use the Save button on any question.</p>
          <Link to="/explore" className="btn btn--small">Browse the feed</Link>
        </div>
      )}

      <div className="question-list">
        {loading
          ? Array.from({ length: 3 }, (_, i) => <QuestionCardSkeleton key={i} />)
          : questions.map((q) => <QuestionCard key={q._id} q={q} />)}
      </div>
    </div>
  );
}

export default Saved;
