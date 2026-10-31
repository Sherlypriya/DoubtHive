import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

function NotFound() {
  return (
    <div className="page" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        {/* Giant 404 in brand colours */}
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '8rem',
          fontWeight: 900,
          fontStyle: 'italic',
          letterSpacing: '0.04em',
          background: 'linear-gradient(135deg, var(--accent), var(--violet), var(--hot))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          lineHeight: 1,
          marginBottom: '1rem',
        }}>
          404
        </div>

        <h2 style={{ marginBottom: '0.5rem' }}>Quest not found</h2>
        <p style={{ color: 'var(--ink-soft)', marginBottom: '2rem' }}>
          This page doesn't exist or was removed. Head back to the hive.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/explore" className="btn">
            <Home size={16} /> Explore doubts
          </Link>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => window.history.back()}
          >
            <ArrowLeft size={16} /> Go back
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotFound;
