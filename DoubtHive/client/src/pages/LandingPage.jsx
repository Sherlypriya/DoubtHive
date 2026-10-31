import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HelpCircle, Users, Star, Trophy,
  ArrowRight, CheckCircle2, Zap, MessageSquare,
  Sun, Moon, ChevronDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { getQuestionStats } from '../api/questionApi';

/* ── Hexagon SVG logo ───────────────────────────────────────────── */
function HexLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="lp-hexg" x1="0" y1="0" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#22E4FF" />
          <stop offset="1" stopColor="#9A6BFF" />
        </linearGradient>
      </defs>
      <polygon points="15,1 27,8 27,22 15,29 3,22 3,8" stroke="url(#lp-hexg)" strokeWidth="2" />
      <polygon points="15,8 21,11.5 21,18.5 15,22 9,18.5 9,11.5" fill="url(#lp-hexg)" />
    </svg>
  );
}

/* ── Animated hex grid watermark ─────────────────────────────────── */
function HexGrid() {
  return (
    <div className="lp-hex-grid" aria-hidden="true">
      {Array.from({ length: 18 }, (_, i) => (
        <svg key={i} className="lp-hex-grid__cell" viewBox="0 0 60 68" fill="none">
          <polygon
            points="30,2 57,17 57,51 30,66 3,51 3,17"
            stroke="rgba(34,228,255,0.18)"
            strokeWidth="1"
          />
        </svg>
      ))}
    </div>
  );
}

/* ── Feature card data ───────────────────────────────────────────── */
const FEATURES = [
  {
    icon: HelpCircle,
    color: '#22e4ff',
    title: 'Ask Doubts',
    desc: 'Post any academic question — from algorithms to thermodynamics. Tag it, describe it, and let the hive find the answer.',
  },
  {
    icon: MessageSquare,
    color: '#9a6bff',
    title: 'Help Your Peers',
    desc: 'Answer questions, get upvoted, and watch your reputation grow. Faculty can post verified answers that stand out.',
  },
  {
    icon: Zap,
    color: '#ffc83d',
    title: 'Earn Rewards',
    desc: 'Every answer earns XP. Every upvote boosts your reputation. Spend XP on real campus perks from the Rewards Shop.',
  },
  {
    icon: Trophy,
    color: '#2dffa8',
    title: 'Climb the Leaderboard',
    desc: 'Compete by department, earn badges, and reach Hive Legend status. Your contributions define your rank.',
  },
];

/* ── Stats ticker ────────────────────────────────────────────────── */
function AnimatedNumber({ target }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (target === 0) return;
    const step = Math.ceil(target / 40);
    const interval = setInterval(() => {
      setVal((v) => {
        if (v + step >= target) { clearInterval(interval); return target; }
        return v + step;
      });
    }, 30);
    return () => clearInterval(interval);
  }, [target]);

  return <span ref={ref}>{val}</span>;
}

/* ── How it works steps ──────────────────────────────────────────── */
const HOW_STEPS = [
  { n: '01', title: 'Create your account', desc: 'Choose your role — Student, Faculty, or Admin — and sign up in seconds.' },
  { n: '02', title: 'Post or browse doubts', desc: 'Tag your question by subject and department so the right people see it.' },
  { n: '03', title: 'Collaborate and earn', desc: 'Answer questions, collect upvotes, unlock badges, and spend XP on perks.' },
];

/* ── Main component ──────────────────────────────────────────────── */
function LandingPage() {
  const { isAuthenticated, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalQuestions: 0, totalAnswers: 0 });

  useEffect(() => {
    getQuestionStats()
      .then(({ data }) => setStats(data))
      .catch(() => {});
  }, []);

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate(user?.role === 'admin' ? '/admin' : '/explore');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="lp">

      {/* ── Landing Navbar ──────────────────────────────────────── */}
      <header className="lp-nav">
        <Link to="/" className="lp-nav__brand">
          <HexLogo size={28} />
          <span className="lp-nav__brand-name">DoubtHive</span>
        </Link>

        <nav className="lp-nav__links">
          <Link to="/explore" className="lp-nav__link">Explore Doubts</Link>
          <Link to="/leaderboard" className="lp-nav__link">Leaderboard</Link>
          <Link to="/perks" className="lp-nav__link">Perks</Link>
        </nav>

        <div className="lp-nav__cta">
          <button
            type="button"
            className="lp-nav__theme-btn"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {isAuthenticated ? (
            <Link to={user?.role === 'admin' ? '/admin' : '/explore'} className="lp-btn lp-btn--primary">
              Go to dashboard <ArrowRight size={15} />
            </Link>
          ) : (
            <>
              <Link to="/login" className="lp-nav__link">Login</Link>
              <Link to="/register" className="lp-btn lp-btn--primary">
                Get Started <ArrowRight size={15} />
              </Link>
            </>
          )}
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="lp-hero">
        <HexGrid />

        {/* Aurora blobs */}
        <div className="lp-aurora" aria-hidden="true">
          <div className="lp-aurora__blob lp-aurora__blob--1" />
          <div className="lp-aurora__blob lp-aurora__blob--2" />
          <div className="lp-aurora__blob lp-aurora__blob--3" />
        </div>

        <div className="lp-hero__inner">
          <div className="lp-hero__badge">
            <Zap size={13} /> Gamified learning platform
          </div>

          <h1 className="lp-hero__heading">
            Every Doubt Is a Step<br />
            <span className="lp-hero__heading-gradient">Towards Mastery.</span>
          </h1>

          <p className="lp-hero__sub">
            Ask questions, share knowledge, earn XP, and level up together.
            Turn academic doubts into collaborative quests.
          </p>

          <div className="lp-hero__actions">
            <button type="button" className="lp-btn lp-btn--hero" onClick={handleGetStarted}>
              Get Started <ArrowRight size={16} />
            </button>
            <Link to="/explore" className="lp-btn lp-btn--outline">
              Explore Doubts <ChevronDown size={16} />
            </Link>
          </div>

          {/* Live stats */}
          <div className="lp-hero__stats">
            <div className="lp-stat">
              <div className="lp-stat__value">
                <AnimatedNumber target={stats.totalQuestions || 0} />+
              </div>
              <div className="lp-stat__label">Questions asked</div>
            </div>
            <div className="lp-stat__divider" />
            <div className="lp-stat">
              <div className="lp-stat__value">
                <AnimatedNumber target={stats.totalAnswers || 0} />+
              </div>
              <div className="lp-stat__label">Answers shared</div>
            </div>
            <div className="lp-stat__divider" />
            <div className="lp-stat">
              <div className="lp-stat__value">9</div>
              <div className="lp-stat__label">Achievement badges</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section className="lp-features">
        <div className="lp-section-inner">
          <div className="lp-section-label">
            <Star size={14} /> Features
          </div>
          <h2 className="lp-section-heading">Everything you need to learn faster</h2>
          <p className="lp-section-sub">
            DoubtHive blends the best of a Q&A platform with game mechanics to keep students engaged.
          </p>

          <div className="lp-features__grid">
            {FEATURES.map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="lp-feature-card" style={{ '--fc': color }}>
                <div className="lp-feature-card__icon">
                  <Icon size={22} />
                </div>
                <h3 className="lp-feature-card__title">{title}</h3>
                <p className="lp-feature-card__desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section className="lp-how">
        <div className="lp-section-inner">
          <div className="lp-section-label">
            <CheckCircle2 size={14} /> How it works
          </div>
          <h2 className="lp-section-heading">Three steps to start earning XP</h2>

          <div className="lp-how__steps">
            {HOW_STEPS.map(({ n, title, desc }) => (
              <div key={n} className="lp-how__step">
                <div className="lp-how__step-num">{n}</div>
                <h3 className="lp-how__step-title">{title}</h3>
                <p className="lp-how__step-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Role cards ───────────────────────────────────────────── */}
      <section className="lp-roles">
        <div className="lp-section-inner">
          <div className="lp-section-label">
            <Users size={14} /> Who's it for?
          </div>
          <h2 className="lp-section-heading">Built for every member of your campus</h2>

          <div className="lp-roles__grid">
            <Link to="/student-login" className="lp-role-card lp-role-card--student">
              <div className="lp-role-card__num">🎓</div>
              <h3>Students</h3>
              <p>Ask doubts, track your learning journey, earn XP, and unlock perks.</p>
              <span className="lp-role-card__cta">Student portal →</span>
            </Link>
            <Link to="/faculty-login" className="lp-role-card lp-role-card--faculty">
              <div className="lp-role-card__num">📚</div>
              <h3>Faculty</h3>
              <p>Guide students with verified answers that get highlighted in the feed.</p>
              <span className="lp-role-card__cta">Faculty portal →</span>
            </Link>
            <Link to="/admin-login" className="lp-role-card lp-role-card--admin">
              <div className="lp-role-card__num">🛡️</div>
              <h3>Admins</h3>
              <p>Moderate content, manage users, and configure campus rewards.</p>
              <span className="lp-role-card__cta">Admin portal →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA banner ───────────────────────────────────────────── */}
      <section className="lp-cta-banner">
        <div className="lp-aurora" aria-hidden="true" style={{ opacity: 0.5 }}>
          <div className="lp-aurora__blob lp-aurora__blob--2" />
        </div>
        <div className="lp-section-inner lp-cta-banner__inner">
          <h2 className="lp-cta-banner__heading">
            Ready to turn doubts into XP?
          </h2>
          <p className="lp-cta-banner__sub">
            Join your campus community. Start asking, start answering, start levelling up.
          </p>
          <div className="lp-hero__actions" style={{ justifyContent: 'center' }}>
            <button type="button" className="lp-btn lp-btn--hero" onClick={handleGetStarted}>
              Get Started free <ArrowRight size={16} />
            </button>
            <Link to="/explore" className="lp-btn lp-btn--outline">
              Browse questions
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-section-inner lp-footer__inner">
          <div className="lp-footer__brand">
            <HexLogo size={24} />
            <span className="lp-footer__brand-name">DoubtHive</span>
            <span className="lp-footer__tagline">Ask. Answer. Learn. Earn.</span>
          </div>
          <div className="lp-footer__links">
            <Link to="/explore">Explore Doubts</Link>
            <Link to="/leaderboard">Leaderboard</Link>
            <Link to="/perks">Perks</Link>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </div>
          <div className="lp-footer__copy">
            © {new Date().getFullYear()} DoubtHive — College Mini Project
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
