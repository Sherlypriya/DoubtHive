import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, MessageCircle, CheckCircle2, ThumbsUp, Award } from 'lucide-react';
import {
  getNotifications, markNotificationRead, markAllNotificationsRead,
} from '../api/notificationApi';
import { useAuth } from '../context/AuthContext.jsx';
import { timeAgo } from '../utils/format.js';

const POLL_MS = 30000;

const ICONS = {
  answer: MessageCircle,
  accepted: CheckCircle2,
  upvote: ThumbsUp,
  badge: Award,
};

function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const wrapRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data } = await getNotifications();
      setItems(data.notifications);
      setUnread(data.unreadCount);
    } catch { /* silent — a failed poll shouldn't bother the user */ }
  }, []);

  // Poll while the tab is visible; refresh immediately when it becomes visible again.
  useEffect(() => {
    load();
    const tick = () => { if (document.visibilityState === 'visible') load(); };
    const timer = setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [load]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleOpen = () => {
    setOpen((o) => !o);
    if (!open) load();
  };

  const handleClick = async (n) => {
    setOpen(false);
    if (!n.read) {
      setItems((list) => list.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
      setUnread((c) => Math.max(0, c - 1));
      markNotificationRead(n._id).catch(() => {});
    }
    navigate(n.questionId ? `/questions/${n.questionId}` : `/users/${user._id}`);
  };

  const handleMarkAll = async () => {
    setItems((list) => list.map((x) => ({ ...x, read: true })));
    setUnread(0);
    markAllNotificationsRead().catch(() => {});
  };

  return (
    <div className="bell" ref={wrapRef}>
      <button
        type="button"
        className="nav__icon-btn"
        onClick={handleOpen}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
      >
        <Bell size={16} />
        {unread > 0 && <span className="bell__count">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="notif-panel" role="dialog" aria-label="Notifications">
          <div className="notif-panel__head">
            <span>Notifications</span>
            {unread > 0 && <button type="button" onClick={handleMarkAll}>Mark all read</button>}
          </div>

          <div className="notif-panel__list">
            {items.length === 0 && (
              <div className="notif-empty">Nothing yet. Answers and upvotes will show up here.</div>
            )}
            {items.map((n) => {
              const Icon = ICONS[n.type] || Bell;
              return (
                <button
                  key={n._id}
                  type="button"
                  className={`notif-item${n.read ? '' : ' notif-item--unread'}`}
                  onClick={() => handleClick(n)}
                >
                  <span className="notif-item__icon"><Icon size={14} /></span>
                  <span className="notif-item__text">
                    {n.message}
                    <span className="notif-item__time">{timeAgo(n.createdAt)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
