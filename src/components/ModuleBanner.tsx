import React from 'react';
import type { CurriculumModule } from '../utils/roadmapLoader';
import '../assets/css/roadmap.css';

interface ModuleBannerProps {
  module: CurriculumModule;
  onOpenGrammar: (moduleId: string) => void;
}

export const ModuleBanner: React.FC<ModuleBannerProps> = ({ module, onOpenGrammar }) => {
  return (
    <div
      className="module-banner-container"
      style={{
        '--banner-color': module.themeColor || '#58CC02'
      } as React.CSSProperties}
    >
      <div className="module-banner-content">
        <h2 className="module-banner-title">{module.title}</h2>
        <p className="module-banner-desc">{module.description}</p>
      </div>

      <button
        className="module-banner-grammar-btn"
        onClick={() => onOpenGrammar(module.id)}
      >
        <div className="btn-inner">
          <span className="btn-icon">📖</span>
          <span className="btn-text">Útmutató</span>
        </div>
      </button>
    </div>
  );
};
