import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Gift, Coffee, BookOpen, Pen, Ticket, Award, Star,
  Check, Clock, AlertCircle, ShoppingBag, ChevronDown, ChevronUp,
} from 'lucide-react';
import { getPerks, redeemPerk, getMyRedemptions } from '../api/perkApi';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { timeAgo } from '../utils/format.js';

const ICON_MAP = {
  coffee: Coffee,
  book: BookOpen,
  pen: Pen,
  ticket: Ticket,
  award: Award,
  star: Star,
  gift: Gift,
};

const CATEGORY_LABELS = {
  canteen: 'Canteen',
  library: 'Library',
  stationery: 'Stationery',
  event: 'Event',
  other: 'Other',
};

function PerkIcon({ icon, size = 20 }) {
  const Icon = ICON_MAP[icon] || Gift;
  return <Icon size={size} />;
}

function PerkCard({ perk, onRedeem, userReputation, busy }) {
  const canAfford = userReputation >= perk.cost;
  const isAvailable = perk.isAvailable;

  return (
    <div className={`perk-card${!isAvailable ? ' perk-card--unavailable' : ''}`}>
      <div className="perk-card__icon">
        <PerkIcon icon={perk.icon} size={24} />
      </div>
      <div className="perk-card__body">
        <div className="perk-card__title">{perk.title}</div>
        {perk.isDemo && (
          <span className="perk-card__demo-tag">Demo reward</span>
        )}
        <p className="perk-card__desc">{perk.description}</p>
        <div className="perk-card__meta">
          <span className="perk-card__category">{CATEGORY_LABELS[perk.category] || perk.category}</span>
          {perk.totalStock !== null && (
            <span className="perk-card__stock">
              {perk.redeemedCount}/{perk.totalStock} claimed
            </span>
          )}
        </div>
      </div>
      <div className="perk-card__footer">
        <div className="perk-card__cost">
          <Star size={14} />
          <span>{perk.cost} XP</span>
        </div>
        <button
          type="button"
          className={`btn btn--small${!canAfford || !isAvailable ? ' btn--disabled' : ''}`}
          onClick={() => onRedeem(perk)}
          disabled={busy || !canAfford || !isAvailable}
          title={
            !isAvailable
              ? 'Out of stock'
              : !canAfford
              ? `Need ${perk.cost - userReputation} more XP`
              : 'Redeem this perk'
          }
        >
          {busy ? 'Redeeming…' : !isAvailable ? 'Out of stock' : !canAfford ? `Need ${perk.cost - userReputation} more XP` : 'Redeem'}
        </button>
      </div>
    </div>
  );
}

function RedemptionHistory({ redemptions }) {
  const [open, setOpen] = useState(false);
  if (redemptions.length === 0) return null;

  return (
    <div className="redemption-history">
      <button
        type="button"
        className="redemption-history__toggle"
        onClick={() => setOpen((o) => !o)}
      >
        <ShoppingBag size={15} /> My redemptions ({redemptions.length})
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div className="redemption-history__list">
          {redemptions.map((r) => (
            <div key={r._id} className={`redemption-item redemption-item--${r.status}`}>
              <div className="redemption-item__title">
                {r.perkId?.title || 'Deleted perk'}
              </div>
              <div className="redemption-item__meta">
                <span className={`badge badge--${r.status === 'fulfilled' ? 'resolved' : r.status === 'cancelled' ? 'danger' : 'open'}`}>
                  {r.status}
                </span>
                <span>Code: <code>{r.redemptionCode}</code></span>
                <span>{timeAgo(r.createdAt)}</span>
                <span>{r.costAtRedemption} XP</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Perks() {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const toast = useToast();

  const [perks, setPerks] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyPerkId, setBusyPerkId] = useState(null);
  const [confirmPerk, setConfirmPerk] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [perksRes, redeemRes] = await Promise.allSettled([
        getPerks(),
        isAuthenticated ? getMyRedemptions() : Promise.resolve({ data: { redemptions: [] } }),
      ]);
      if (perksRes.status === 'fulfilled') setPerks(perksRes.value.data.perks);
      if (redeemRes.status === 'fulfilled') setRedemptions(redeemRes.value.data.redemptions);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load perks');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { load(); }, [load]);

  const handleConfirmRedeem = (perk) => {
    if (!isAuthenticated) {
      toast.info('Log in to redeem perks.');
      return;
    }
    setConfirmPerk(perk);
  };

  const handleRedeem = async () => {
    if (!confirmPerk) return;
    setBusyPerkId(confirmPerk._id);
    setConfirmPerk(null);
    try {
      const { data } = await redeemPerk(confirmPerk._id);
      toast.success(
        `🎉 Redeemed! Your code: ${data.redemptionCode}. ${confirmPerk.isDemo ? '(Simulated demo reward)' : ''}`
      );
      await load();
      await refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Redemption failed');
    } finally {
      setBusyPerkId(null);
    }
  };

  const rep = user?.reputation ?? 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Rewards shop</h1>
          <p>Spend your XP on campus perks. Earn XP by answering questions.</p>
        </div>
        {isAuthenticated && (
          <div className="xp-balance">
            <Star size={16} style={{ color: 'var(--gold)' }} />
            <span>{rep} XP available</span>
          </div>
        )}
      </div>

      {/* Demo notice */}
      <div className="notice notice--info" role="note">
        <AlertCircle size={16} />
        <span>
          All rewards shown are <strong>simulated demo rewards</strong> for this mini-project. Redemption codes are for demonstration purposes only and are not redeemable at any real campus facility.
        </span>
      </div>

      {!isAuthenticated && (
        <div className="notice notice--warning">
          <AlertCircle size={16} />
          <span>
            <Link to="/login">Log in</Link> to see your XP balance and redeem rewards.
          </span>
        </div>
      )}

      {loading && (
        <div className="perk-grid">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="perk-card skeleton-card" aria-hidden="true">
              <div className="skeleton" style={{ width: 48, height: 48, borderRadius: '50%' }} />
              <div className="skeleton-card__body">
                <div className="skeleton" style={{ height: 16, width: '60%' }} />
                <div className="skeleton" style={{ height: 12, width: '95%' }} />
                <div className="skeleton" style={{ height: 12, width: '40%' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p style={{ color: 'var(--rust)' }}>{error}</p>}

      {!loading && !error && perks.length === 0 && (
        <div className="empty-state">
          <Gift size={28} style={{ color: 'var(--honey-dark)', marginBottom: '0.5rem' }} />
          <p>No perks available yet. Check back soon!</p>
        </div>
      )}

      {!loading && perks.length > 0 && (
        <div className="perk-grid">
          {perks.map((perk) => (
            <PerkCard
              key={perk._id}
              perk={perk}
              onRedeem={handleConfirmRedeem}
              userReputation={rep}
              busy={busyPerkId === perk._id}
            />
          ))}
        </div>
      )}

      {isAuthenticated && <RedemptionHistory redemptions={redemptions} />}

      {/* Confirmation modal */}
      {confirmPerk && (
        <div className="modal-overlay" onClick={() => setConfirmPerk(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '0.5rem' }}>Confirm redemption</h3>
            <p style={{ color: 'var(--ink-soft)', marginBottom: '1rem' }}>
              Redeem <strong>{confirmPerk.title}</strong> for <strong>{confirmPerk.cost} XP</strong>?
              {confirmPerk.isDemo && (
                <><br /><span style={{ color: 'var(--gold)', fontSize: '0.85rem' }}>This is a simulated demo reward.</span></>
              )}
            </p>
            <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Your XP will drop from <strong>{rep}</strong> to <strong>{rep - confirmPerk.cost}</strong>.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" className="btn" onClick={handleRedeem}>
                <Check size={15} /> Confirm
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setConfirmPerk(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Perks;
