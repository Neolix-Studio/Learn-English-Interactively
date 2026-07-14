import { useNavigate } from 'react-router-dom';

export function PlacementScreen() {
  const navigate = useNavigate();

  return (
    <div className="welcome-step">
      <h2 className="welcome-step-title">
        Honnan szeretnéd kezdeni?
      </h2>
      
      <div className="welcome-option-stack welcome-placement-stack">
        <button
          onClick={() => navigate('/lesson/ftue')}
          style={{
            border: '2px solid #e5e7eb',
            background: 'white',
            color: '#4b5563',
            cursor: 'pointer',
            gap: '1rem'
          }}
          className="welcome-option-button welcome-placement-button"
          onMouseOver={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#eff6ff'; }}
          onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = 'white'; }}
        >
          <div className="welcome-placement-icon" style={{ background: '#3b82f6' }}>
            🐣
          </div>
          <div className="welcome-placement-copy">
            <span>Kezdés az alapoktól</span>
            <span style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 500 }}>Végezd el az angol kurzus legkönnyebb leckéjét</span>
          </div>
        </button>

        <button
          onClick={() => alert("A szintfelmérő teszt hamarosan érkezik!")}
          style={{
            border: '2px solid #e5e7eb',
            background: 'white',
            color: '#4b5563',
            cursor: 'pointer',
            gap: '1rem'
          }}
          className="welcome-option-button welcome-placement-button"
          onMouseOver={(e) => { e.currentTarget.style.borderColor = '#f59e0b'; e.currentTarget.style.background = '#fffbeb'; }}
          onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = 'white'; }}
        >
          <div className="welcome-placement-icon" style={{ background: '#f59e0b' }}>
            🧭
          </div>
          <div className="welcome-placement-copy">
            <span>Szintfelmérő teszt</span>
            <span style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 500 }}>Tudd meg, hol tartasz! (Hamarosan)</span>
          </div>
        </button>
      </div>

      <button 
        onClick={() => navigate(-1)} 
        className="welcome-back-button"
      >
        Vissza
      </button>
    </div>
  );
}
