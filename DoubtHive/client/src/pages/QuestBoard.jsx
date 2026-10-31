import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, HelpCircle, Inbox, CheckCircle2, MessageCircle,
  TrendingUp, Award, Plus, X, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { getQuestions, getQuestionStats } from '../api/questionApi';
import { getLeaderboard } from '../api/userApi';
import { SUBJECTS, DEPARTMENTS, SEMESTERS } from '../constants/options';
import { useAuth } from '../context/AuthContext.jsx';
import QuestionCard, { QuestionCardSkeleton } from '../components/QuestionCard.jsx';
import PlayerCard from '../components/PlayerCard.jsx';
import { initials } from '../utils/format.js';

const PAGE_SIZE = 10;

const initialFilters = {
  search: '',
  subject: '',
  department: '',
  semester: '',
  tag: '',
  status: '',
  sort: 'newest',
  unanswered: false,
  page: 1,
};

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'answers', label: 'Most answered' },
  { value: 'views', label: 'Most viewed' },
];

function Home() {
  const { user } = useAuth();
  const isStudent = user?.role === 'student';

  const [questions, setQuestions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState(() => ({
    ...initialFilters,
    department: isStudent && user?.department ? user.department : '',
  }));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [stats, setStats] = useState(null);
  const [topUsers, setTopUsers] = useState([]);

  // Sync student's department if profile finishes loading
  useEffect(() => {
    if (isStudent && user?.department) {
      setFilters((f) => (f.department !== user.department ? { ...f, department: user.department } : f));
    }
  }, [isStudent, user?.department]);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const activeDept = isStudent && user?.department ? user.department : filters.department;
      const { data } = await getQuestions({
        search: filters.search || undefined,
        subject: filters.subject || undefined,
        department: activeDept || undefined,
        semester: filters.semester || undefined,
        tag: filters.tag || undefined,
        status: filters.status || undefined,
        sort: filters.sort,
        unanswered: filters.unanswered ? 'true' : undefined,
        page: filters.page,
        limit: PAGE_SIZE,
      });
      setQuestions(data.questions);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [filters, isStudent, user?.department]);

  useEffect(() => {
    const timeout = setTimeout(fetchQuestions, 300);
    return () => clearTimeout(timeout);
  }, [fetchQuestions]);

  // Sidebar data loads once — it doesn't depend on the feed filters
  useEffect(() => {
    getQuestionStats().then(({ data }) => setStats(data)).catch(() => {});
    getLeaderboard({ limit: 3 }).then(({ data }) => setTopUsers(data.users)).catch(() => {});
  }, []);

  // Any filter change sends you back to page 1
  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value, page: 1 }));
  };

  const clearFilters = () => setFilters(initialFilters);
  const toggleTag = (tag) =>
    setFilters((f) => ({ ...f, tag: f.tag === tag ? '' : tag, page: 1 }));

  const goToPage = (page) => {
    setFilters((f) => ({ ...f, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasActiveFilters =
    filters.search || filters.subject || filters.department || filters.tag ||
    filters.status || filters.unanswered || filters.sort !== 'newest';

  return (
    <div className="page page--wide">
      <div className="page-header">
        <div>
          <h1>Quest board</h1>
          <p>Pick a doubt, solve it, earn XP.</p>
        </div>
        <Link to="/ask" className="btn">
          <Plus size={16} /> New quest
        </Link>
      </div>

      {stats && (
        <div className="stat-strip">
          <div className="stat-pill">
            <div className="stat-pill__icon"><HelpCircle size={18} /></div>
            <div>
              <div className="stat-pill__value">{stats.totalQuestions}</div>
              <div className="stat-pill__label">Total quests</div>
            </div>
          </div>
          <div className="stat-pill">
            <div className="stat-pill__icon"><Inbox size={18} /></div>
            <div>
              <div className="stat-pill__value">{stats.openQuestions}</div>
              <div className="stat-pill__label">Open quests</div>
            </div>
          </div>
          <div className="stat-pill">
            <div className="stat-pill__icon"><CheckCircle2 size={18} /></div>
            <div>
              <div className="stat-pill__value">{stats.resolvedQuestions}</div>
              <div className="stat-pill__label">Cleared</div>
            </div>
          </div>
          <div className="stat-pill">
            <div className="stat-pill__icon"><MessageCircle size={18} /></div>
            <div>
              <div className="stat-pill__value">{stats.totalAnswers}</div>
              <div className="stat-pill__label">Answers given</div>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        {/* ---------- Main feed ---------- */}
        <div>
          {isStudent && user?.department && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '10px',
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                fontSize: '0.88rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.25rem' }}>🎓</span>
                <div>
                  <strong>{user.department}</strong> doubts feed
                  {user.semester ? ` • Semester ${user.semester}` : ''}
                  <div style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', marginTop: '0.15rem' }}>
                    Access restricted to your department. Cross-department doubts are hidden.
                  </div>
                </div>
              </div>
              <span className="badge badge--student">Department Protected</span>
            </div>
          )}

          <div className="filter-bar">
            <div className="filter-bar__search-wrap">
              <Search size={15} />
              <input
                name="search"
                placeholder="Search questions..."
                value={filters.search}
                onChange={handleFilterChange}
                aria-label="Search questions"
              />
            </div>

            <select name="subject" value={filters.subject} onChange={handleFilterChange} aria-label="Subject">
              <option value="">All subjects</option>
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>

            {isStudent ? (
              <select
                name="department"
                value={user?.department || ''}
                disabled
                title="Department is locked to your enrolled department"
                style={{ opacity: 0.9, cursor: 'not-allowed' }}
              >
                <option value={user?.department}>{user?.department} (Locked)</option>
              </select>
            ) : (
              <select name="department" value={filters.department} onChange={handleFilterChange} aria-label="Department">
                <option value="">All departments</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            )}

            <select name="semester" value={filters.semester} onChange={handleFilterChange} aria-label="Semester">
              <option value="">{isStudent && user?.semester ? `Semester ${user.semester} (Default)` : 'All semesters'}</option>
              {SEMESTERS.map((s) => <option key={s} value={s}>Semester {s}</option>)}
            </select>

            <select name="status" value={filters.status} onChange={handleFilterChange} aria-label="Status">
              <option value="">Any status</option>
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
            </select>

            <input
              className="filter-tag"
              name="tag"
              placeholder="Filter by tag..."
              value={filters.tag}
              onChange={handleFilterChange}
              aria-label="Filter by tag"
            />

            <label className="filter-checkbox">
              <input
                type="checkbox"
                name="unanswered"
                checked={filters.unanswered}
                onChange={handleFilterChange}
              />
              Unanswered only
            </label>

            <select
              className="sort-select"
              name="sort"
              value={filters.sort}
              onChange={handleFilterChange}
              aria-label="Sort questions"
            >
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            {hasActiveFilters && (
              <button type="button" className="btn btn--ghost btn--small" onClick={clearFilters}>
                <X size={14} /> Clear
              </button>
            )}
          </div>

          {!loading && !error && pagination.total > 0 && (
            <p style={{ color: 'var(--ink-faint)', fontSize: '0.85rem', margin: '-0.6rem 0 0.9rem' }}>
              {pagination.total} question{pagination.total === 1 ? '' : 's'}
            </p>
          )}

          {error && <p style={{ color: 'var(--rust)' }}>{error}</p>}
          {!loading && !error && questions.length === 0 && (
            <div className="empty-state">
              <p style={{ marginBottom: '0.75rem' }}>No questions match these filters yet.</p>
              <Link to="/ask" className="btn btn--small">Ask the first one</Link>
            </div>
          )}

          <div className="question-list">
            {loading
              ? Array.from({ length: 4 }, (_, i) => <QuestionCardSkeleton key={i} />)
              : questions.map((q) => <QuestionCard key={q._id} q={q} />)}
          </div>

          {!loading && pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => goToPage(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <span>Page {pagination.page} of {pagination.totalPages}</span>
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => goToPage(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* ---------- Sidebar ---------- */}
        <div className="sidebar">
          <PlayerCard />

          <div className="sidebar-card sidebar-card--cta">
            <h3>Got a doubt?</h3>
            <p>Post it as a new quest and let the hive help.</p>
            <Link to="/ask" className="btn btn--full">
              <Plus size={16} /> New quest
            </Link>
          </div>

          {stats?.trendingTags?.length > 0 && (
            <div className="sidebar-card">
              <h3><TrendingUp size={16} /> Trending tags</h3>
              <div className="trending-tags">
                {stats.trendingTags.map(({ tag, count }) => (
                  <button
                    key={tag}
                    type="button"
                    className={`trending-tag-btn${filters.tag === tag ? ' trending-tag-btn--active' : ''}`}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag} <span className="trending-tag-btn__count">{count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {topUsers.length > 0 && (
            <div className="sidebar-card">
              <h3><Award size={16} /> Top players</h3>
              <div className="mini-leaderboard">
                {topUsers.map((u, i) => (
                  <Link key={u._id} to={`/users/${u._id}`} className="mini-leaderboard-row">
                    <span className="mini-leaderboard-row__rank">{i + 1}</span>
                    <div className="avatar-hex avatar-hex--sm" aria-hidden="true">{initials(u.name)}</div>
                    <span className="mini-leaderboard-row__name">{u.name}</span>
                    <span className="mini-leaderboard-row__rep">{u.reputation}</span>
                  </Link>
                ))}
              </div>
              <Link to="/leaderboard" className="sidebar-link">View full leaderboard</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;
