import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Wraps a route so only authenticated users (optionally with a specific role)
 * can access it. Unauthenticated users are redirected to /login; the current
 * path is saved so we can redirect back after login.
 *
 * Usage:
 *   <Route path="/ask" element={<ProtectedRoute><AskQuestion /></ProtectedRoute>} />
 *   <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
 */
function ProtectedRoute({ children, role }) {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  // While restoring session from localStorage, show nothing (avoids flash)
  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="loading-spinner" aria-label="Loading…" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role && user?.role !== role) {
    return <Navigate to="/explore" replace />;
  }

  return children;
}

export default ProtectedRoute;
