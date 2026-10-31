import { HelpCircle, Users, Award } from 'lucide-react';

const FEATURES = [
  { icon: HelpCircle, text: 'Every doubt is a new quest. Ask anything.' },
  { icon: Users, text: 'Team up with classmates and faculty' },
  { icon: Award, text: 'Earn XP, level up and climb the ranks' },
];

// Large, layered hexagon outlines used purely as a decorative watermark —
// the same identity shape as the logo/avatars, just scaled way up.
function HexWatermark() {
  return (
    <svg className="auth-shell__watermark" viewBox="0 0 400 400" fill="none" aria-hidden="true">
      <polygon className="ring-a" points="200,20 356,110 356,290 200,380 44,290 44,110" stroke="#22E4FF" strokeWidth="1.5" opacity="0.28" />
      <polygon className="ring-b" points="200,70 313,135 313,265 200,330 87,265 87,135" stroke="#9A6BFF" strokeWidth="1.5" opacity="0.4" strokeDasharray="6 8" />
      <polygon className="ring-a" points="200,125 266,163 266,237 200,275 134,237 134,163" stroke="#FF3D9A" strokeWidth="1.5" opacity="0.35" />
      <polygon points="200,170 245,195 245,245 200,270 155,245 155,195" fill="#22E4FF" opacity="0.08" />
    </svg>
  );
}

function AuthLayout({ children }) {
  return (
    <div className="auth-shell">
      <div className="auth-shell__brand">
        <HexWatermark />
        <div className="auth-shell__brand-inner">
          <div className="auth-shell__brand-word">DoubtHive</div>
          <p className="auth-shell__tagline">
            Press start. Turn doubts into XP.
          </p>
          <ul className="auth-shell__features">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text}>
                <span className="auth-shell__feature-icon"><Icon size={16} /></span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="auth-shell__form">{children}</div>
    </div>
  );
}

export default AuthLayout;
