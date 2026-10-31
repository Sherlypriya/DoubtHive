import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, HelpCircle, MessageCircle, Bell, ShieldAlert,
  RefreshCw, ChevronLeft, ChevronRight, Trash2,
  UserCheck, Star,
} from 'lucide-react';
import {
  getAdminStats, getAdminUsers, updateUserRole,
  getAdminQuestions, adminDeleteQuestion,
} from '../api/adminApi';
import { adminGetAllPerks, adminCreatePerk, adminUpdatePerk } from '../api/perkApi';
import { useToast } from '../context/ToastContext.jsx';
import { timeAgo } from '../utils/format.js';

const TABS = [
  { id: 'overview', label: 'Overview', icon: ShieldAlert },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'questions', label: 'Questions', icon: HelpCircle },
  { id: 'perks', label: 'Perks', icon: Star },
];

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="stat-card" style={{ borderColor: color ? `color-mix(in srgb, ${color} 30%, transparent)` : undefined }}>
      <Icon size={20} style={{ color: color || 'var(--honey-dark)', marginBottom: '0.4rem' }} />
      <div className="stat-card__value">{value}</div>
      <div className="stat-card__label">{label}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--ink-faint)', marginTop: '0.2rem' }}>{sub}</div>}
    </div>
  );
}

/* ─── Overview tab ─────────────────────────────────────────────────────────── */
function OverviewTab({ stats, loading }) {
  if (loading) return <p style={{ color: 'var(--ink-faint)' }}>Loading stats…</p>;
  if (!stats) return null;
  const { users, questions, answers } = stats;
  return (
    <div>
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        <StatCard icon={Users} label="Total users" value={users.total} sub={`${users.students} students · ${users.faculty} faculty`} />
        <StatCard icon={HelpCircle} label="Questions" value={questions.total} sub={`${questions.open} open · ${questions.resolved} resolved`} color="var(--accent)" />
        <StatCard icon={MessageCircle} label="Answers" value={answers.total} color="var(--violet)" />
        <StatCard icon={Bell} label="Admins" value={users.admins} color="var(--hot)" />
      </div>

      {stats.topUsers?.length > 0 && (
        <div className="admin-section">
          <h3>Top contributors</h3>
          <div className="leaderboard-list" style={{ marginTop: '0.75rem' }}>
            {stats.topUsers.map((u, i) => (
              <Link key={u._id} to={`/users/${u._id}`} className="leaderboard-row">
                <div className="leaderboard-row__rank">{i + 1}</div>
                <div className="leaderboard-row__info">
                  <div className="leaderboard-row__name">
                    {u.name}
                    {u.role === 'faculty' && <span className="badge badge--faculty" style={{ marginLeft: '0.4rem' }}>Faculty</span>}
                  </div>
                  <div className="leaderboard-row__sub">{u.department || '—'}</div>
                </div>
                <div className="leaderboard-row__rep">{u.reputation} XP</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {stats.recentQuestions?.length > 0 && (
        <div className="admin-section">
          <h3>Recent questions</h3>
          <div className="leaderboard-list" style={{ marginTop: '0.75rem' }}>
            {stats.recentQuestions.map((q) => (
              <Link key={q._id} to={`/questions/${q._id}`} className="leaderboard-row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--ink-faint)' }}>{q.userId?.name} · {timeAgo(q.createdAt)}</div>
                </div>
                <span className={`badge badge--${q.status}`}>{q.status}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Users tab ────────────────────────────────────────────────────────────── */
function UsersTab() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getAdminUsers({ search: search || undefined, role: role || undefined, page });
      setUsers(data.users);
      setPagination(data.pagination);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, role, page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleRoleChange = async (userId, newRole) => {
    if (!window.confirm(`Change role to "${newRole}"?`)) return;
    setBusyId(userId);
    try {
      await updateUserRole(userId, newRole);
      toast.success(`Role updated to ${newRole}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="filter-bar" style={{ marginBottom: '1rem' }}>
        <input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ flex: 1 }}
        />
        <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="">All roles</option>
          <option value="student">Student</option>
          <option value="faculty">Faculty</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {loading ? <p style={{ color: 'var(--ink-faint)' }}>Loading users…</p> : (
        <>
          <p style={{ color: 'var(--ink-faint)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
            {pagination.total} user{pagination.total !== 1 ? 's' : ''}
          </p>
          <div className="admin-table">
            {users.map((u) => (
              <div key={u._id} className="admin-table__row">
                <div className="admin-table__info">
                  <div className="admin-table__name">{u.name}</div>
                  <div className="admin-table__meta">{u.email} · {u.department || '—'} · {u.reputation} XP</div>
                </div>
                <div className="admin-table__actions">
                  <select
                    value={u.role}
                    disabled={busyId === u._id}
                    onChange={(e) => handleRoleChange(u._id, e.target.value)}
                    className="role-select"
                  >
                    <option value="student">Student</option>
                    <option value="faculty">Faculty</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
          {pagination.totalPages > 1 && (
            <div className="pagination" style={{ marginTop: '1rem' }}>
              <button className="btn btn--ghost btn--small" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
                <ChevronLeft size={14} /> Prev
              </button>
              <span>Page {page} of {pagination.totalPages}</span>
              <button className="btn btn--ghost btn--small" onClick={() => setPage((p) => p + 1)} disabled={page >= pagination.totalPages}>
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Questions moderation tab ─────────────────────────────────────────────── */
function QuestionsTab() {
  const toast = useToast();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1 });
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getAdminQuestions({ status: status || undefined, page });
      setQuestions(data.questions);
      setPagination(data.pagination);
    } catch {
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [status, page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this question and all its answers?')) return;
    setBusyId(id);
    try {
      await adminDeleteQuestion(id);
      toast.success('Question deleted');
      setQuestions((prev) => prev.filter((q) => q._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="filter-bar" style={{ marginBottom: '1rem' }}>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>
      {loading ? <p style={{ color: 'var(--ink-faint)' }}>Loading questions…</p> : (
        <>
          <div className="admin-table">
            {questions.map((q) => (
              <div key={q._id} className="admin-table__row">
                <div className="admin-table__info">
                  <Link to={`/questions/${q._id}`} className="admin-table__name">{q.title}</Link>
                  <div className="admin-table__meta">
                    {q.userId?.name} · {q.subject} · {q.answersCount} answers · {timeAgo(q.createdAt)}
                  </div>
                </div>
                <div className="admin-table__actions">
                  <span className={`badge badge--${q.status}`}>{q.status}</span>
                  <button
                    type="button"
                    className="btn btn--danger btn--small"
                    disabled={busyId === q._id}
                    onClick={() => handleDelete(q._id)}
                    title="Delete question"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {pagination.totalPages > 1 && (
            <div className="pagination" style={{ marginTop: '1rem' }}>
              <button className="btn btn--ghost btn--small" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
                <ChevronLeft size={14} /> Prev
              </button>
              <span>Page {page} of {pagination.totalPages}</span>
              <button className="btn btn--ghost btn--small" onClick={() => setPage((p) => p + 1)} disabled={page >= pagination.totalPages}>
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Perks admin tab ──────────────────────────────────────────────────────── */
function PerksAdminTab() {
  const toast = useToast();
  const [perks, setPerks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', description: '', cost: '', category: 'other', totalStock: '', icon: 'gift' });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminGetAllPerks();
      setPerks(data.perks);
    } catch {
      toast.error('Failed to load perks');
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setErrors([]);
    setSubmitting(true);
    try {
      await adminCreatePerk({
        ...form,
        cost: Number(form.cost),
        totalStock: form.totalStock ? Number(form.totalStock) : null,
      });
      toast.success('Perk created');
      setForm({ title: '', description: '', cost: '', category: 'other', totalStock: '', icon: 'gift' });
      load();
    } catch (err) {
      setErrors(err.response?.data?.errors || [err.response?.data?.message || 'Failed to create perk']);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (perk) => {
    try {
      await adminUpdatePerk(perk._id, { isActive: !perk.isActive });
      toast.success(`Perk ${perk.isActive ? 'deactivated' : 'activated'}`);
      load();
    } catch {
      toast.error('Failed to update perk');
    }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Create new perk</h3>
        {errors.length > 0 && (
          <div className="form-errors"><ul>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul></div>
        )}
        <form onSubmit={handleCreate} className="stack">
          <div className="form-row">
            <label className="form-field" style={{ flex: 2 }}>
              Title
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Free canteen beverage" />
            </label>
            <label className="form-field">
              Cost (XP)
              <input required type="number" min="1" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="e.g. 20" />
            </label>
          </div>
          <label className="form-field">
            Description
            <textarea required rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What does this perk offer?" />
          </label>
          <div className="form-row">
            <label className="form-field">
              Category
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="canteen">Canteen</option>
                <option value="library">Library</option>
                <option value="stationery">Stationery</option>
                <option value="event">Event</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="form-field">
              Stock limit (blank = unlimited)
              <input type="number" min="1" value={form.totalStock} onChange={(e) => setForm({ ...form, totalStock: e.target.value })} placeholder="e.g. 50" />
            </label>
            <label className="form-field">
              Icon
              <select value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}>
                {['gift', 'coffee', 'book', 'pen', 'ticket', 'award', 'star'].map((ic) => (
                  <option key={ic} value={ic}>{ic}</option>
                ))}
              </select>
            </label>
          </div>
          <button type="submit" className="btn" disabled={submitting}>
            <UserCheck size={15} /> {submitting ? 'Creating…' : 'Create perk'}
          </button>
        </form>
      </div>

      {loading ? <p style={{ color: 'var(--ink-faint)' }}>Loading perks…</p> : (
        <div className="admin-table">
          {perks.length === 0 && <p style={{ color: 'var(--ink-faint)' }}>No perks yet.</p>}
          {perks.map((p) => (
            <div key={p._id} className="admin-table__row">
              <div className="admin-table__info">
                <div className="admin-table__name">{p.title}</div>
                <div className="admin-table__meta">
                  {p.cost} XP · {p.category} · {p.redeemedCount} redeemed{p.totalStock ? `/${p.totalStock}` : ''}
                </div>
              </div>
              <div className="admin-table__actions">
                <span className={`badge badge--${p.isActive ? 'resolved' : 'danger'}`}>
                  {p.isActive ? 'Active' : 'Inactive'}
                </span>
                <button
                  type="button"
                  className={`btn btn--small${p.isActive ? ' btn--ghost' : ''}`}
                  onClick={() => handleToggleActive(p)}
                >
                  {p.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main admin dashboard ─────────────────────────────────────────────────── */
function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    getAdminStats()
      .then(({ data }) => setStats(data))
      .catch(() => toast.error('Failed to load platform stats'))
      .finally(() => setStatsLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="page page--wide">
      <div className="page-header">
        <div>
          <h1>Admin panel</h1>
          <p>Platform statistics, moderation, and perk management.</p>
        </div>
        <button
          type="button"
          className="btn btn--ghost btn--small"
          onClick={() => {
            setStatsLoading(true);
            getAdminStats()
              .then(({ data }) => setStats(data))
              .catch(() => toast.error('Failed to refresh'))
              .finally(() => setStatsLoading(false));
          }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="tab-bar">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`tab-btn${activeTab === id ? ' tab-btn--active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <div className="admin-content">
        {activeTab === 'overview' && <OverviewTab stats={stats} loading={statsLoading} />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'questions' && <QuestionsTab />}
        {activeTab === 'perks' && <PerksAdminTab />}
      </div>
    </div>
  );
}

export default AdminDashboard;
