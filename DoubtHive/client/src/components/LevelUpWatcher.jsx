import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { getLevelInfo } from '../constants/game.js';
import { LevelBadge } from './XpBar.jsx';

const storageKey = (id) => `doubthive-xp-${id}`;
const read = (id) => { try { return localStorage.getItem(storageKey(id)); } catch { return null; } };
const write = (id, v) => { try { localStorage.setItem(storageKey(id), String(v)); } catch { /* ignore */ } };

// Keeps XP fresh (on navigation + tab focus), toasts "+N XP", and shows a
// full-screen celebration when the player reaches a new level.
export default function LevelUpWatcher() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const { pathname } = useLocation();
  const lastXp = useRef(null);
  const [levelUp, setLevelUp] = useState(null);

  useEffect(() => { if (user?._id) refreshUser(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onFocus = () => refreshUser();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshUser]);

  useEffect(() => {
    if (!user?._id) { lastXp.current = null; return; }
    const xp = user.reputation || 0;
    if (lastXp.current === null) {
      const saved = read(user._id);
      lastXp.current = saved !== null ? Number(saved) : xp;
    }
    const prev = lastXp.current;
    if (xp > prev) {
      const before = getLevelInfo(prev);
      const after = getLevelInfo(xp);
      if (after.level > before.level) setLevelUp({ level: after.level, title: after.title, gained: xp - prev });
      else toast.success(`+${xp - prev} XP earned!`);
    }
    lastXp.current = xp;
    write(user._id, xp);
  }, [user?._id, user?.reputation]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!levelUp) return undefined;
    const t = setTimeout(() => setLevelUp(null), 7000);
    return () => clearTimeout(t);
  }, [levelUp]);

  // Random but stable confetti pieces for one celebration
  const pieces = useMemo(
    () => Array.from({ length: 28 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      dur: 1.8 + Math.random() * 1.6,
      hue: [38, 340, 265, 165, 12][i % 5],
      size: 8 + Math.random() * 10,
    })),
    [levelUp] // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (!levelUp) return null;

  return (
    <div className="levelup" role="dialog" aria-modal="true" aria-label="Level up" onClick={() => setLevelUp(null)}>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="levelup__confetti"
          style={{
            left: `${p.left}%`, width: p.size, height: p.size,
            animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`,
            background: `hsl(${p.hue} 95% 58%)`,
          }}
        />
      ))}
      <div className="levelup__box" onClick={(e) => e.stopPropagation()}>
        <div className="levelup__kicker">LEVEL UP!</div>
        <LevelBadge level={levelUp.level} size="xl" />
        <div className="levelup__title">{levelUp.title}</div>
        <p className="levelup__text">+{levelUp.gained} XP. The hive grows stronger.</p>
        <button type="button" className="btn" onClick={() => setLevelUp(null)}>Continue</button>
      </div>
    </div>
  );
}
