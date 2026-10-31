import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import LandingPage from './pages/LandingPage.jsx';
import QuestBoard from './pages/QuestBoard.jsx';
import RoleSelect from './pages/RoleSelect.jsx';
import Login from './pages/Login.jsx';
import StudentLogin from './pages/StudentLogin.jsx';
import FacultyLogin from './pages/FacultyLogin.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import Register from './pages/Register.jsx';
import AskQuestion from './pages/AskQuestion.jsx';
import QuestionDetail from './pages/QuestionDetail.jsx';
import Profile from './pages/Profile.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import Saved from './pages/Saved.jsx';
import Perks from './pages/Perks.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import NotFound from './pages/NotFound.jsx';
import LevelUpWatcher from './components/LevelUpWatcher.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useAuth } from './context/AuthContext.jsx';

// Redirect already-authenticated users away from all login/register pages.
function GuestRoute({ children, authRedirectTo = '/explore' }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (isAuthenticated) {
    const dest = user?.role === 'admin'
      ? '/admin'
      : location.state?.from?.pathname || authRedirectTo;
    return <Navigate to={dest} replace />;
  }
  return children;
}

// The Navbar renders on every page EXCEPT the landing page and the
// role-specific login pages (those have their own navigation).
function AppShell() {
  const location = useLocation();
  const landingRoutes = ['/', '/student-login', '/faculty-login', '/admin-login', '/login'];
  const isLandingNav = landingRoutes.includes(location.pathname);

  return (
    <>
      {!isLandingNav && <Navbar />}
      <LevelUpWatcher />
      <Routes>
        {/* ── Public ─────────────────────────────────────────────── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/explore" element={<QuestBoard />} />
        {/* Back-compat: old / bookmark used to be the quest board */}
        <Route path="/questions" element={<Navigate to="/explore" replace />} />

        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/questions/:id" element={<QuestionDetail />} />
        <Route path="/users/:id" element={<Profile />} />
        <Route path="/perks" element={<Perks />} />

        {/* ── Auth ────────────────────────────────────────────────── */}
        <Route path="/login" element={<GuestRoute><RoleSelect /></GuestRoute>} />
        <Route path="/student-login" element={<GuestRoute authRedirectTo="/explore"><StudentLogin /></GuestRoute>} />
        <Route path="/faculty-login" element={<GuestRoute authRedirectTo="/explore"><FacultyLogin /></GuestRoute>} />
        <Route path="/admin-login" element={<GuestRoute authRedirectTo="/admin"><AdminLogin /></GuestRoute>} />
        <Route path="/login/direct" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

        {/* ── Protected ───────────────────────────────────────────── */}
        <Route path="/ask" element={<ProtectedRoute><AskQuestion /></ProtectedRoute>} />
        <Route path="/saved" element={<ProtectedRoute><Saved /></ProtectedRoute>} />

        {/* ── Admin-only ──────────────────────────────────────────── */}
        <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />

        {/* ── 404 ─────────────────────────────────────────────────── */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

function App() {
  return <AppShell />;
}

export default App;
