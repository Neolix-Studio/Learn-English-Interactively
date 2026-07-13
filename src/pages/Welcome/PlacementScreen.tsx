import { useNavigate } from 'react-router-dom';

export function PlacementScreen() {
  const navigate = useNavigate();

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1f2937', marginBottom: '2rem' }}>
        Honnan szeretnéd kezdeni?
      </h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <button
          onClick={() => navigate('/lesson/ftue')}
          style={{
            padding: '1.5rem',
            border: '2px solid #e5e7eb',
            borderRadius: '16px',
            background: 'white',
            fontSize: '1.1rem',
            fontWeight: 700,
            color: '#4b5563',
            cursor: 'pointer',
            transition: 'all 0.2s',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}
          onMouseOver={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#eff6ff'; }}
          onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = 'white'; }}
        >
          <div style={{ width: '40px', height: '40px', background: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            🐣
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span>Kezdés az alapoktól</span>
            <span style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 500 }}>Végezd el az angol kurzus legkönnyebb leckéjét</span>
          </div>
        </button>

        <button
          onClick={() => alert("A szintfelmérő teszt hamarosan érkezik!")}
          style={{
            padding: '1.5rem',
            border: '2px solid #e5e7eb',
            borderRadius: '16px',
            background: 'white',
            fontSize: '1.1rem',
            fontWeight: 700,
            color: '#4b5563',
            cursor: 'pointer',
            transition: 'all 0.2s',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}
          onMouseOver={(e) => { e.currentTarget.style.borderColor = '#f59e0b'; e.currentTarget.style.background = '#fffbeb'; }}
          onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = 'white'; }}
        >
          <div style={{ width: '40px', height: '40px', background: '#f59e0b', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            🧭
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span>Szintfelmérő teszt</span>
            <span style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 500 }}>Tudd meg, hol tartasz! (Hamarosan)</span>
          </div>
        </button>
      </div>

      <button 
        onClick={() => navigate(-1)} 
        style={{ marginTop: '2rem', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontWeight: 600 }}
      >
        Vissza
      </button>
    </div>
  );
}
