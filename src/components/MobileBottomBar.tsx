import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useShop } from '../context/ShopContext';

interface MobileBottomBarProps {
  activeTab: 'levels' | 'curriculum' | 'stats' | 'profile';
  onTabClick?: (tab: 'levels' | 'curriculum' | 'stats' | 'profile') => void;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({ activeTab, onTabClick }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { openShop } = useShop();

  const handleTabClick = (tab: 'levels' | 'curriculum' | 'stats' | 'profile') => {
    if (onTabClick) {
      onTabClick(tab);
    }

    if (tab === 'profile' && location.pathname !== '/profile') {
      navigate('/profile');
    } else if (tab !== 'profile' && location.pathname !== '/dashboard') {
      navigate('/dashboard', { state: { openTab: tab } });
    }
  };

  return (
    <nav className="mobile-bottom-bar" aria-label="Mobil navigáció">
      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'levels' ? 'active' : ''}`}
        onClick={() => handleTabClick('levels')}
      >
        <span className="bottom-nav-icon">☰</span>
        <span>{t('dashboard.nav_levels')}</span>
      </button>

      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'curriculum' ? 'active' : ''}`}
        onClick={() => handleTabClick('curriculum')}
      >
        <span className="bottom-nav-icon">🏠</span>
        <span>{t('dashboard.nav_curriculum')}</span>
      </button>

      <button
        type="button"
        className="bottom-nav-item"
        onClick={openShop}
        style={{ position: 'relative' }}
        aria-label={t('dashboard.nav_shop')}
      >
        <span className="bottom-nav-icon">🛒</span>
        <span>{t('dashboard.nav_shop')}</span>
      </button>

      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'stats' ? 'active' : ''}`}
        onClick={() => handleTabClick('stats')}
      >
        <span className="bottom-nav-icon">🎯</span>
        <span>{t('dashboard.nav_stats')}</span>
      </button>

      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
        onClick={() => handleTabClick('profile')}
      >
        <span className="bottom-nav-icon">👤</span>
        <span>{t('dashboard.nav_profile')}</span>
      </button>
    </nav>
  );
};
