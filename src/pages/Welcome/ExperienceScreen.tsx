import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function ExperienceScreen() {
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const options = [
    { id: 1, text: 'Teljesen új vagyok az angolban', bars: 1 },
    { id: 2, text: 'Tudok néhány gyakori szót', bars: 2 },
    { id: 3, text: 'Tudok alapvető beszélgetéseket folytatni', bars: 3 },
    { id: 4, text: 'Tudok különböző témákról beszélni', bars: 4 },
    { id: 5, text: 'Részletesen tudok beszélni a legtöbb témáról', bars: 5 },
  ];

  const renderSignalBars = (activeCount: number) => {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '24px', marginRight: '1rem' }}>
        {[1, 2, 3, 4, 5].map((barIndex) => (
          <div
            key={barIndex}
            style={{
              width: '4px',
              backgroundColor: barIndex <= activeCount ? '#3b82f6' : '#e5e7eb',
              height: `${8 + barIndex * 3}px`,
              borderRadius: '2px'
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="welcome-step">
      <h2 className="welcome-step-title">
        Mennyire tudsz angolul?
      </h2>
      
      <div className="welcome-option-stack">
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
              {renderSignalBars(option.bars)}
              {option.text}
            </button>
          );
        })}
      </div>

      <div className="welcome-continue welcome-continue-spacious">
        <button
          onClick={() => navigate('/welcome/placement')}
          disabled={selectedOption === null}
          style={{
            width: '100%',
            border: 'none',
            background: selectedOption !== null ? '#58cc02' : '#e5e7eb',
            color: selectedOption !== null ? 'white' : '#9ca3af',
            cursor: selectedOption !== null ? 'pointer' : 'default',
            boxShadow: selectedOption !== null ? '0 4px 0 #46a302' : 'none',
            marginBottom: '4px' // To account for the box-shadow active state
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
