import { useNavigate } from 'react-router-dom';

export function WelcomeStartScreen() {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
      
      {/* Mock Mascot Image - You can replace this with your actual SVG or image */}
      <div style={{
        width: '150px',
        height: '150px',
        backgroundColor: '#e5e7eb',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '2rem',
        fontSize: '4rem'
      }}>
        🐾
      </div>

      <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1f2937', marginBottom: '1rem', textAlign: 'center' }}>
        Üdvözlünk a Lexipaws-nál!
      </h2>
      
      <p style={{ fontSize: '1.1rem', color: '#6b7280', textAlign: 'center', marginBottom: '3rem', maxWidth: '300px' }}>
        A legszórakoztatóbb módja az angoltanulásnak.
      </p>

      <div style={{ width: '100%', marginTop: 'auto' }}>
        <button
          onClick={() => navigate('/welcome/hear-about-us')}
          style={{
            width: '100%',
            padding: '1rem',
            border: 'none',
            borderRadius: '16px',
            background: '#58cc02',
            color: 'white',
            fontSize: '1.1rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'background 0.2s',
            boxShadow: '0 4px 0 #46a302',
            marginBottom: '4px'
          }}
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
