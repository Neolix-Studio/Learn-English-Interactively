import { useNavigate } from 'react-router-dom';

export function WelcomeStartScreen() {
  const navigate = useNavigate();

  return (
    <div className="welcome-step welcome-start-step">

      <div className="welcome-paw-mark" style={{
        backgroundColor: '#e5e7eb',
      }}>
        🐾
      </div>

      <h2 className="welcome-start-title">
        Üdvözlünk a Lexipaws-nál!
      </h2>

      <p className="welcome-start-copy">
        A legszórakoztatóbb módja az angoltanulásnak.
      </p>

      <div className="welcome-start-action">
        <button
          onClick={() => navigate('/welcome/hear-about-us')}
          style={{
            width: '100%',
            border: 'none',
            background: '#58cc02',
            color: 'white',
            cursor: 'pointer',
            boxShadow: '0 4px 0 #46a302',
            marginBottom: '4px'
          }}
          className="welcome-primary-button"
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'translateY(4px)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 0 #46a302';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 0 #46a302';
          }}
        >
          TOVÁBB
        </button>
      </div>
    </div>
  );
}
