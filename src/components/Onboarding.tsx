import React, { useState } from 'react';

const onboardingSteps = [
    {
        title: "Hogyan hallottál rólunk?",
        options: ["Keresőmotor", "Közösségi média", "Ismerősön keresztül", "Egyéb"]
    },
    {
        title: "Miért tanulsz angolul?",
        options: ["Munka / Karrier", "Utazás", "Iskola", "Szórakozás", "Agytorna"]
    },
    {
        title: "Mennyire tudsz angolul?",
        options: ["Még csak most kezdem", "Tudok néhány szót", "Megértem az egyszerűbb mondatokat", "Középhaladó vagyok"]
    },
    {
        title: "Mi a napi célod?",
        options: ["Napi 3 perc (Kényelmes)", "Napi 10 perc (Normál)", "Napi 15 perc (Komoly)", "Napi 30 perc (Intenzív)"]
    },
    {
        title: "Szeretnél értesítéseket kapni, hogy ne felejts el gyakorolni?",
        options: ["Igen, kérek értesítést", "Nem, majd eszembe jut"]
    },
    {
        title: "Készen állsz? Honnan kezdjük?",
        options: ["Teljesen az alapoktól indulok", "Már tudok valamennyit (Szintfelmérő)"]
    }
];

export const Onboarding: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});

    const handleSelect = (option: string) => {
        const stepTitle = onboardingSteps[currentStep].title;
        const newAnswers = { ...answers, [stepTitle]: option };
        setAnswers(newAnswers);

        if (currentStep < onboardingSteps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            localStorage.setItem('ftue_marketing_data', JSON.stringify(newAnswers));
            onComplete();
        }
    };

    const step = onboardingSteps[currentStep];

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'var(--color-bg-base)',
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
        }}>
            <div style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ width: '90px', height: '90px', marginRight: '1rem', flexShrink: 0 }}>
                        <img src="/assets/images/Transparent PNGs/lexi-head.png" alt="Lexi" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>

                    <div style={{ position: 'relative', background: '#fff', padding: '1.25rem', borderRadius: '20px', border: '2px solid #E5E7EB', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', flex: 1 }}>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1F2937' }}>{step.title}</h2>
                        <div style={{ position: 'absolute', top: '50%', left: '-10px', transform: 'translateY(-50%) rotate(45deg)', width: '20px', height: '20px', background: '#fff', borderBottom: '2px solid #E5E7EB', borderLeft: '2px solid #E5E7EB' }}></div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: step.options.length >= 4 ? '1fr 1fr' : '1fr', gap: '0.8rem', width: '100%' }}>
                    {step.options.map((opt, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleSelect(opt)}
                            style={{
                                padding: '1rem',
                                fontSize: '1rem',
                                fontWeight: 700,
                                textAlign: 'center',
                                border: '2px solid #E5E7EB',
                                borderRadius: '16px',
                                background: '#fff',
                                color: '#4B5563',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                width: '100%'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.background = '#F3F4F6';
                                e.currentTarget.style.borderColor = '#D1D5DB';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.background = '#fff';
                                e.currentTarget.style.borderColor = '#E5E7EB';
                            }}
                            onMouseDown={(e) => e.currentTarget.style.transform = 'translateY(2px)'}
                            onMouseUp={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
