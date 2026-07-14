import React, { useState } from 'react';
import { useUser } from '../../context/UserContext';
import { useTranslation } from 'react-i18next';

interface ShopModalProps {
  onClose: () => void;
}

const TABS = ['power_ups', 'coming_soon'] as const;
type Tab = typeof TABS[number];

export const ShopModal: React.FC<ShopModalProps> = ({ onClose }) => {
  const { data, updateProgress, buyCosmetic } = useUser();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('power_ups');
  const [buyFeedback, setBuyFeedback] = useState<string | null>(null);

  const bones = data.scores?.bones || 0;

  const handleBuyShield = () => {
    if (bones >= 100) {
      updateProgress({
        scores: {
          ...data.scores,
          bones: bones - 100,
          streak_shields: (data.scores?.streak_shields || 0) + 1,
        },
      });
      setBuyFeedback('🛡️ Streak Shield vásárolva!');
      setTimeout(() => setBuyFeedback(null), 2500);
    }
  };

  const handleBuyTheme = async (themeId: string, cost: number) => {
    const currentBones = data.scores?.bones || 0;
    if (currentBones < cost) {
      setBuyFeedback(`❌ Nincs elég csontod! (${cost} szükséges, neked: ${currentBones})`);
      setTimeout(() => setBuyFeedback(null), 2500);
      return;
    }
    const res = await buyCosmetic('theme', themeId, cost);
    if (res.success) {
      setBuyFeedback(`✅ Téma megvásárolva!`);
      setTimeout(() => setBuyFeedback(null), 2500);
    } else {
      setBuyFeedback(`❌ ${res.message || 'Sikertelen vásárlás'}`);
      setTimeout(() => setBuyFeedback(null), 2500);
    }
  };

  return (
    <div
      className="modal-overlay is-active"
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100dvh', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal-content"
        style={{ background: 'var(--color-bg-surface)', borderRadius: '24px', padding: '0', width: '100%', maxWidth: '480px', boxShadow: '0 25px 60px rgba(0,0,0,0.3)', position: 'relative', overflow: 'hidden', border: 'var(--glass-border)' }}
      >
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, var(--color-accent-in), var(--color-accent-at))', padding: '1.5rem 2rem', position: 'relative' }}>
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}
          >✕</button>
          <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>🛒</div>
          <h2 style={{ margin: '0 0 0.25rem 0', color: 'white', fontSize: '1.6rem', fontWeight: 900 }}>Bolt</h2>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.2)', borderRadius: '20px', padding: '0.3rem 0.9rem' }}>
            <span style={{ fontSize: '1rem' }}>🦴</span>
            <span style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem' }}>{bones.toLocaleString()} Csont</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-bg-base)', background: 'var(--color-bg-surface)' }}>
          {[
            { id: 'power_ups' as Tab, label: '⚡ Power-Ups' },
            { id: 'coming_soon' as Tab, label: '🔮 Hamarosan' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, padding: '0.85rem', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: activeTab === tab.id ? 700 : 500, fontSize: '0.9rem',
                color: activeTab === tab.id ? 'var(--color-accent-in)' : 'var(--color-text-muted)',
                borderBottom: activeTab === tab.id ? '2px solid var(--color-accent-in)' : '2px solid transparent',
                transition: 'all 0.2s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Success toast */}
        {buyFeedback && (
          <div style={{ margin: '1rem 1.5rem 0', padding: '0.75rem 1rem', background: 'color-mix(in srgb, #10B981 15%, transparent)', border: '1px solid #10B981', borderRadius: '10px', color: '#10B981', fontWeight: 700, fontSize: '0.9rem', textAlign: 'center', animation: 'scaleUp 0.2s ease' }}>
            {buyFeedback}
          </div>
        )}

        {/* Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '55vh', overflowY: 'auto' }}>

          {activeTab === 'power_ups' && (
            <>
              {/* Streak Shield */}
              <div style={{ border: '1.5px solid var(--color-bg-base)', borderRadius: '16px', padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--color-bg-base)', transition: 'border-color 0.2s', cursor: 'default' }}
                onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--color-accent-in)')}
                onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--color-bg-base)')}
              >
                <div style={{ fontSize: '2.5rem', flexShrink: 0 }}>🛡️</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-text-main)', fontWeight: 700 }}>Streak Shield</h3>
                    <span style={{ background: 'color-mix(in srgb, #10B981 15%, transparent)', color: '#10B981', fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: '10px' }}>
                      Tulajdonodban: {data.scores?.streak_shields || 0}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Megvédi a sorozatodat, ha kihagysz egy napot.</p>
                </div>
                <button
                  onClick={handleBuyShield}
                  disabled={bones < 100}
                  style={{
                    flexShrink: 0, background: bones >= 100 ? 'linear-gradient(135deg, var(--color-accent-in), var(--color-accent-at))' : 'var(--color-bg-surface)',
                    color: bones >= 100 ? 'white' : 'var(--color-text-muted)',
                    border: 'none', padding: '0.5rem 1rem', borderRadius: '10px', fontWeight: 700, cursor: bones >= 100 ? 'pointer' : 'not-allowed',
                    fontSize: '0.85rem', whiteSpace: 'nowrap', boxShadow: bones >= 100 ? '0 4px 12px rgba(79,70,229,0.3)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  🦴 100
                </button>
              </div>
              {/* Fall Theme */}
              {!(data.unlocked_themes || []).includes('fall') ? (
                <div style={{ border: '1.5px solid var(--color-bg-base)', borderRadius: '16px', padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--color-bg-base)', transition: 'border-color 0.2s', cursor: 'default' }}
                  onMouseOver={e => (e.currentTarget.style.borderColor = '#F59E0B')}
                  onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--color-bg-base)')}
                >
                  <div style={{ fontSize: '2.5rem', flexShrink: 0 }}>🍂</div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.2rem 0', fontSize: '1rem', color: 'var(--color-text-main)', fontWeight: 700 }}>Fall Téma</h3>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Őszi hangulat meleg narancssárga tónusokkal.</p>
                  </div>
                  <button
                    onClick={() => handleBuyTheme('fall', 200)}
                    disabled={(data.scores?.bones || 0) < 200}
                    style={{
                      flexShrink: 0,
                      background: (data.scores?.bones || 0) >= 200 ? 'linear-gradient(135deg, #F59E0B, #EF4444)' : 'var(--color-bg-surface)',
                      color: (data.scores?.bones || 0) >= 200 ? 'white' : 'var(--color-text-muted)',
                      border: 'none', padding: '0.5rem 1rem', borderRadius: '10px', fontWeight: 700,
                      cursor: (data.scores?.bones || 0) >= 200 ? 'pointer' : 'not-allowed',
                      fontSize: '0.85rem', whiteSpace: 'nowrap',
                      boxShadow: (data.scores?.bones || 0) >= 200 ? '0 4px 12px rgba(245,158,11,0.3)' : 'none',
                    }}
                  >
                    🦴 200
                  </button>
                </div>
              ) : (
                <div style={{ border: '1.5px solid color-mix(in srgb, #F59E0B 40%, transparent)', borderRadius: '16px', padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'color-mix(in srgb, #F59E0B 6%, var(--color-bg-base))' }}>
                  <div style={{ fontSize: '2.5rem', flexShrink: 0 }}>🍂</div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.2rem 0', fontSize: '1rem', color: 'var(--color-text-main)', fontWeight: 700 }}>Fall Téma</h3>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#F59E0B', fontWeight: 700 }}>✓ Megvásárolva — A Profilban aktiválható</p>
                  </div>
                </div>
              )}

              {/* Halloween Theme */}
              {!(data.unlocked_themes || []).includes('halloween') ? (
                <div style={{ border: '1.5px solid var(--color-bg-base)', borderRadius: '16px', padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--color-bg-base)', transition: 'border-color 0.2s', cursor: 'default' }}
                  onMouseOver={e => (e.currentTarget.style.borderColor = '#7C3AED')}
                  onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--color-bg-base)')}
                >
                  <div style={{ fontSize: '2.5rem', flexShrink: 0 }}>🎃</div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.2rem 0', fontSize: '1rem', color: 'var(--color-text-main)', fontWeight: 700 }}>Halloween Téma</h3>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Sötét boszorkányos megjelenés narancssárga akcentusokkal.</p>
                  </div>
                  <button
                    onClick={() => handleBuyTheme('halloween', 500)}
                    disabled={(data.scores?.bones || 0) < 500}
                    style={{
                      flexShrink: 0,
                      background: (data.scores?.bones || 0) >= 500 ? 'linear-gradient(135deg, #7C3AED, #EF4444)' : 'var(--color-bg-surface)',
                      color: (data.scores?.bones || 0) >= 500 ? 'white' : 'var(--color-text-muted)',
                      border: 'none', padding: '0.5rem 1rem', borderRadius: '10px', fontWeight: 700,
                      cursor: (data.scores?.bones || 0) >= 500 ? 'pointer' : 'not-allowed',
                      fontSize: '0.85rem', whiteSpace: 'nowrap',
                      boxShadow: (data.scores?.bones || 0) >= 500 ? '0 4px 12px rgba(124,58,237,0.3)' : 'none',
                    }}
                  >
                    🦴 500
                  </button>
                </div>
              ) : (
                <div style={{ border: '1.5px solid color-mix(in srgb, #7C3AED 40%, transparent)', borderRadius: '16px', padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'color-mix(in srgb, #7C3AED 6%, var(--color-bg-base))' }}>
                  <div style={{ fontSize: '2.5rem', flexShrink: 0 }}>🎃</div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.2rem 0', fontSize: '1rem', color: 'var(--color-text-main)', fontWeight: 700 }}>Halloween Téma</h3>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#7C3AED', fontWeight: 700 }}>✓ Megvásárolva — A Profilban aktiválható</p>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'coming_soon' && (
            <>
              {/* Empty / Coming Soon state */}
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem', filter: 'grayscale(30%)' }}>🔮</div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-main)', fontSize: '1.2rem', fontWeight: 800 }}>Hamarosan érkezik!</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.6, maxWidth: '280px', margin: '0 auto 1.5rem' }}>
                  Új tárgyakon dolgozunk — Lexi felszerelések, speciális témák, és még sok más!
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[
                    { icon: '👔', name: 'Lexi: Formal Attire', cost: '400 🦴' },
                    { icon: '🎩', name: 'Lexi: Magic Hat', cost: '600 🦴' },
                    { icon: '🌊', name: 'Ocean Theme', cost: '300 🦴' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 1rem', background: 'var(--color-bg-base)', borderRadius: '12px', border: '1.5px dashed color-mix(in srgb, var(--color-text-muted) 30%, transparent)', opacity: 0.75 }}>
                      <span style={{ fontSize: '1.8rem', filter: 'grayscale(100%) opacity(60%)' }}>{item.icon}</span>
                      <div style={{ flex: 1, textAlign: 'left' }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{item.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', opacity: 0.7 }}>{item.cost}</div>
                      </div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, background: 'var(--color-bg-surface)', color: 'var(--color-text-muted)', padding: '0.2rem 0.6rem', borderRadius: '8px', border: '1px solid var(--color-text-muted)', opacity: 0.6 }}>
                        🔒 Hamarosan
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
