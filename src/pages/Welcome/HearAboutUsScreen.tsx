import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function HearAboutUsScreen() {
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const options = [
    { id: 'tiktok', text: 'TikTok' },
    { id: 'youtube', text: 'YouTube' },
    { id: 'instagram_fb', text: 'Instagram vagy Facebook' },
    { id: 'friends_family', text: 'Barátoktól / Családtól' },
    { id: 'google', text: 'Google keresés' },
    { id: 'other', text: 'Egyéb' },
  ];

  const handleContinue = () => {
    if (selectedOption) {
      // Save for marketing data
      const existingData = JSON.parse(localStorage.getItem('ftue_marketing_data') || '{}');
      existingData.hearAboutUs = selectedOption;
      localStorage.setItem('ftue_marketing_data', JSON.stringify(existingData));
      
      navigate('/welcome/why-learning');
    }
  };

  return (
    <div className="welcome-step">
      <h2 className="welcome-step-title">
        Honnan hallottál rólunk?
      </h2>
      
      <div className="welcome-option-grid">
        {options.map((option) => {
          const isSelected = selectedOption === option.id;
          return (
            <button
              key={option.id}
              onClick={() => setSelectedOption(option.id)}
              style={{
                border: `2px solid ${isSelected ? '#3b82f6' : '#e5e7eb'}`,
                background: isSelected ? '#eff6ff' : 'white',
                color: '#4b5563',
                cursor: 'pointer',
              }}
              className="welcome-option-button"
              onMouseOver={(e) => { 
                if (!isSelected) {
                  e.currentTarget.style.borderColor = '#d1d5db'; 
                  e.currentTarget.style.background = '#f9fafb'; 
                }
              }}
              onMouseOut={(e) => { 
                if (!isSelected) {
                  e.currentTarget.style.borderColor = '#e5e7eb'; 
                  e.currentTarget.style.background = 'white'; 
                }
              }}
            >
              {option.text}
            </button>
          );
        })}
      </div>

      <div className="welcome-continue">
        <button
          onClick={handleContinue}
          disabled={selectedOption === null}
          style={{
            width: '100%',
            border: 'none',
            background: selectedOption !== null ? '#58cc02' : '#e5e7eb',
            color: selectedOption !== null ? 'white' : '#9ca3af',
            cursor: selectedOption !== null ? 'pointer' : 'default',
            boxShadow: selectedOption !== null ? '0 4px 0 #46a302' : 'none',
            marginBottom: '4px'
          }}
          className="welcome-primary-button"
          onMouseDown={(e) => {
            if (selectedOption !== null) {
              e.currentTarget.style.transform = 'translateY(4px)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
          onMouseUp={(e) => {
            if (selectedOption !== null) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 0 #46a302';
            }
          }}
          onMouseLeave={(e) => {
            if (selectedOption !== null) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 0 #46a302';
            }
          }}
        >
          TOVÁBB
        </button>
      </div>
    </div>
  );
}
