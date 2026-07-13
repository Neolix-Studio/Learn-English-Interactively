import React from 'react';

// ─── Base shimmer block ────────────────────────────────────────────────────
const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, var(--color-bg-surface) 25%, var(--color-bg-base) 50%, var(--color-bg-surface) 75%)',
  backgroundSize: '200% 100%',
  animation: 'skeleton-shimmer 1.5s infinite',
  borderRadius: '8px',
};

// ─── Generic block ─────────────────────────────────────────────────────────
export const SkeletonBlock: React.FC<{ width?: string; height?: string; borderRadius?: string; style?: React.CSSProperties }> = ({
  width = '100%',
  height = '1rem',
  borderRadius = '8px',
  style,
}) => (
  <div style={{ ...shimmerStyle, width, height, borderRadius, ...style }} />
);

// ─── Leaderboard row skeleton ──────────────────────────────────────────────
export const SkeletonLeaderboardRow: React.FC<{ index: number }> = ({ index }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '0.9rem 1.2rem',
      borderRadius: '12px',
      background: 'var(--color-bg-surface)',
      border: 'var(--glass-border)',
      animationDelay: `${index * 0.07}s`,
    }}
  >
    {/* Rank number */}
    <SkeletonBlock width="28px" height="28px" borderRadius="50%" />
    {/* Avatar */}
    <SkeletonBlock width="40px" height="40px" borderRadius="50%" style={{ flexShrink: 0 }} />
    {/* Name + badge */}
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <SkeletonBlock width="55%" height="14px" />
      <SkeletonBlock width="35%" height="11px" />
    </div>
    {/* XP */}
    <SkeletonBlock width="60px" height="14px" borderRadius="6px" />
  </div>
);

// ─── Profile page skeleton ─────────────────────────────────────────────────
export const SkeletonProfile: React.FC = () => (
  <div style={{ maxWidth: '700px', margin: '0 auto', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
    {/* Header card */}
    <div style={{ background: 'var(--color-bg-surface)', borderRadius: '20px', padding: '2rem', border: 'var(--glass-border)', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
      <SkeletonBlock width="90px" height="90px" borderRadius="50%" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <SkeletonBlock width="50%" height="20px" />
        <SkeletonBlock width="30%" height="14px" />
        <SkeletonBlock width="70%" height="12px" />
      </div>
    </div>
    {/* Stats row */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ background: 'var(--color-bg-surface)', borderRadius: '14px', padding: '1.2rem', border: 'var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
          <SkeletonBlock width="36px" height="36px" borderRadius="50%" />
          <SkeletonBlock width="60%" height="16px" />
          <SkeletonBlock width="80%" height="12px" />
        </div>
      ))}
    </div>
    {/* Section cards */}
    {[120, 80, 100].map((h, i) => (
      <div key={i} style={{ background: 'var(--color-bg-surface)', borderRadius: '16px', padding: '1.5rem', border: 'var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <SkeletonBlock width="40%" height="18px" />
        <SkeletonBlock width="100%" height={`${h}px`} borderRadius="10px" />
      </div>
    ))}
  </div>
);

// ─── Friends page skeleton ─────────────────────────────────────────────────
export const SkeletonFriendRow: React.FC<{ index: number }> = ({ index }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.85rem 1rem',
    borderRadius: '12px',
    background: 'var(--color-bg-surface)',
    border: 'var(--glass-border)',
    animationDelay: `${index * 0.08}s`,
  }}>
    <SkeletonBlock width="44px" height="44px" borderRadius="50%" style={{ flexShrink: 0 }} />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '7px' }}>
      <SkeletonBlock width="45%" height="14px" />
      <SkeletonBlock width="25%" height="11px" />
    </div>
    <SkeletonBlock width="70px" height="30px" borderRadius="8px" />
  </div>
);
