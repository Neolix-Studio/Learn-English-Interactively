import React, { useState, useEffect } from 'react';
import { DynamicExerciseEngine, type QuestionData } from '../../utils/engine';
import { playSoundEffect, playTTS } from '../../utils/audio';
import { useUser } from '../../context/UserContext';
import { PostLesson } from './PostLesson';

import { ImageChoice } from './exercises/ImageChoice';
import { WordOrder } from './exercises/WordOrder';
import { MatchPairs } from './exercises/MatchPairs';
import { FillBlanks } from './exercises/FillBlanks';
import { TrueFalse } from './exercises/TrueFalse';
import { Dictation } from './exercises/Dictation';

interface BossEncounterProps {
  lessonNode: any;
  onExit: () => void;
  onComplete: (scoreData: any) => void;
}

export const BossEncounter: React.FC<BossEncounterProps> = ({ lessonNode, onExit, onComplete }) => {
  const { isGuest } = useUser();
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Health states
  const [playerHearts, setPlayerHearts] = useState(5);
  const [bossMaxHealth, setBossMaxHealth] = useState(1);
  const [bossHealth, setBossHealth] = useState(1);
  
  // Animation states
  const [bossState, setBossState] = useState<'idle' | 'hit' | 'attack' | 'defeated'>('idle');
  const [playerState, setPlayerState] = useState<'idle' | 'hit'>('idle');

  // Feedback state
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'incorrect'>('none');
  const [selectedAnswerCorrect, setSelectedAnswerCorrect] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPostLesson, setIsPostLesson] = useState(false);
  const [isDefeated, setIsDefeated] = useState(false);

  // Fetch and generate questions on mount
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setIsLoading(true);
        // Use the pre-loaded data directly from Vite import.meta.glob
        const data = lessonNode;
        
        let rawItems = [];
        if (data.levels) {
            rawItems = data.levels[0].exercises;
        } else if (data.items) {
            rawItems = data.items;
        } else if (Array.isArray(data)) {
            rawItems = data;
        }
        
        let generatedQuestions = rawItems.length > 0 && rawItems[0].type 
            ? rawItems 
            : DynamicExerciseEngine.generate(rawItems);
        
        setQuestions(generatedQuestions);
        setBossMaxHealth(generatedQuestions.length);
        setBossHealth(generatedQuestions.length);
      } catch (err) {
        console.error("Failed to load boss data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchQuestions();
  }, [lessonNode]);

  if (isLoading) {
    return <div className="screen active" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#1a1a2e' }}>
      <div className="spinner" style={{ width: '50px', height: '50px', border: '5px solid #eee', borderTopColor: '#ef4444', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
    </div>;
  }

  if (questions.length === 0) {
    return <div className="screen active" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', background: '#1a1a2e', color: 'white' }}>
      <h2>Failed to load boss data</h2>
      <button className="btn" onClick={onExit} style={{ background: '#ef4444' }}>Vissza (Back)</button>
    </div>;
  }

  const currentQuestion = questions[currentIndex];

  const handleAnswerSelected = (isCorrect: boolean) => {
    setSelectedAnswerCorrect(isCorrect);
  };

  const handleCheck = () => {
    if (feedback === 'none') {
      // Determine text to read based on exercise type
      let textToRead = "";
      if (currentQuestion.type === 'word_order') {
        textToRead = currentQuestion.correctAnswer;
      } else if (currentQuestion.type === 'fill_blanks') {
        const expected = currentQuestion.correctAnswer || (Array.isArray(currentQuestion.answer) ? currentQuestion.answer[0] : currentQuestion.answer) || "";
        textToRead = (currentQuestion.sentence || currentQuestion.question || "").replace(/_{3,}/, expected);
      } else if (currentQuestion.type === 'dictation' || currentQuestion.type === 'image_choice' || currentQuestion.type === 'speak_verify') {
        textToRead = currentQuestion.sentence || currentQuestion.correctAnswer;
      }
      
      if (textToRead) {
        playTTS(textToRead);
      }

      if (selectedAnswerCorrect) {
        setFeedback('correct');
        playSoundEffect('success');
        
        // Damage boss
        setBossHealth(prev => Math.max(0, prev - 1));
        setBossState('hit');
        setTimeout(() => setBossState(bossHealth - 1 <= 0 ? 'defeated' : 'idle'), 800);
        
      } else {
        setFeedback('incorrect');
        playSoundEffect('fail');
        
        // Boss attacks player
        setBossState('attack');
        setTimeout(() => setBossState('idle'), 500);
        
        setTimeout(() => {
            setPlayerState('hit');
            setPlayerHearts(prev => Math.max(0, prev - 1));
            setTimeout(() => setPlayerState('idle'), 500);
            
            if (playerHearts - 1 <= 0) {
                setIsDefeated(true);
            }
        }, 400); // Hit impacts after attack animation
      }
    } else {
      setFeedback('none');
      if (bossHealth <= 0) {
        setIsPostLesson(true);
      } else if (currentIndex + 1 < questions.length) {
        setCurrentIndex(prev => prev + 1);
      }
    }
  };

  const renderExercise = () => {
    switch (currentQuestion.type) {
      case 'image_choice': return <ImageChoice question={currentQuestion} onAnswer={handleAnswerSelected} />;
      case 'word_order': return <WordOrder question={currentQuestion} onAnswer={handleAnswerSelected} />;
      case 'match_pairs': return <MatchPairs question={currentQuestion} onAnswer={handleAnswerSelected} />;
      case 'fill_blanks': return <FillBlanks question={currentQuestion} onAnswer={handleAnswerSelected} />;
      case 'true_false': return <TrueFalse question={currentQuestion} onAnswer={handleAnswerSelected} />;
      case 'dictation': return <Dictation question={currentQuestion} onAnswer={handleAnswerSelected} />;
      default: return <div>Unknown exercise type</div>;
    }
  };

  if (isPostLesson) {
    return (
      <div className="screen active interactive-active" style={{ background: 'var(--color-bg-base)', display: 'flex', flexDirection: 'column', height: '100dvh', width: '100%', position: 'fixed', inset: 0, zIndex: 1000 }}>
        <PostLesson 
          baseXp={30} // Bonus XP for Boss
          accuracy={Math.floor((playerHearts / 5) * 100)}
          isGuest={isGuest}
          onComplete={() => onComplete({ xpEarned: 30, perfect: playerHearts === 5 })}
        />
      </div>
    );
  }

  if (isDefeated) {
    return (
      <div className="screen active interactive-active" style={{ background: '#1a1a2e', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', width: '100%', position: 'fixed', inset: 0, zIndex: 1000 }}>
        <h1 style={{ color: '#ef4444', fontSize: '3rem', marginBottom: '1rem' }}>A Főnök Legyőzött!</h1>
        <p style={{ fontSize: '1.2rem', opacity: 0.8, marginBottom: '3rem' }}>Nincs több életed. Próbáld újra!</p>
        <button className="btn btn-primary" onClick={onExit} style={{ background: '#ef4444', borderColor: '#b91c1c', padding: '1rem 3rem', fontSize: '1.2rem', borderRadius: '16px' }}>Vissza a Térképre</button>
      </div>
    );
  }

  return (
    <div className="screen active interactive-active" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', display: 'flex', flexDirection: 'column', height: '100dvh', width: '100%', position: 'fixed', inset: 0, zIndex: 1000 }}>
      
      <style>{`
        .boss-idle { animation: float 3s ease-in-out infinite; filter: drop-shadow(0 10px 20px rgba(0,0,0,0.5)); }
        .boss-hit { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; filter: drop-shadow(0 0 20px red) brightness(2) !important; }
        .boss-attack { animation: lunge 0.5s ease-in forwards; filter: drop-shadow(0 0 30px purple); }
        .boss-defeated { animation: sinkDown 1s ease-in forwards, dissolve 1s ease-in forwards; }
        
        .player-idle { }
        .player-hit { animation: flashRed 0.5s ease; }

        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
          100% { transform: translateY(0px); }
        }
        @keyframes shake {
          10%, 90% { transform: translate3d(-5px, 0, 0); }
          20%, 80% { transform: translate3d(5px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-10px, 0, 0); }
          40%, 60% { transform: translate3d(10px, 0, 0); }
        }
        @keyframes lunge {
          0% { transform: scale(1) translateY(0); }
          50% { transform: scale(1.2) translateY(50px); }
          100% { transform: scale(1) translateY(0); }
        }
        @keyframes sinkDown {
          to { transform: translateY(200px) scale(0.5); }
        }
        @keyframes dissolve {
          to { opacity: 0; filter: blur(10px); }
        }
        @keyframes flashRed {
          0%, 100% { background-color: rgba(239, 68, 68, 0); }
          50% { background-color: rgba(239, 68, 68, 0.3); }
        }
      `}</style>

      {/* HIT FLASH OVERLAY */}
      <div className={`player-${playerState}`} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 10 }}></div>

      {/* HEADER: Health Bars */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem 2rem', gap: '2rem', zIndex: 20 }}>
        <button className="interactive-close-btn" onClick={onExit} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }}>✖</button>
        
        {/* Boss Health Bar */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ color: 'white', fontWeight: 'bold', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.9rem' }}>Főnök (Boss)</div>
            <div style={{ width: '100%', maxWidth: '400px', height: '24px', background: 'rgba(0,0,0,0.5)', borderRadius: '12px', border: '2px solid #4a4a6a', overflow: 'hidden', position: 'relative' }}>
                <div style={{ width: `${(bossHealth / bossMaxHealth) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #b91c1c, #ef4444)', transition: 'width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}></div>
            </div>
        </div>

        {/* Player Hearts */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', color: '#EF4444', fontSize: '1.5rem', background: 'rgba(0,0,0,0.5)', padding: '0.5rem 1rem', borderRadius: '1rem', border: '2px solid #4a4a6a' }}>
          <span>❤️</span>
          <span>{playerHearts}</span>
        </div>
      </header>

      {/* BATTLE ARENA: Boss Graphics */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
          <div className={`boss-${bossState}`} style={{ transition: 'all 0.3s' }}>
              <img src="/assets/images/boss_character.png" alt="Boss" style={{ width: '350px', height: '350px', objectFit: 'contain' }} />
          </div>
      </div>

      {/* MIDDLE: Exercise Content Wrapped in Panel */}
      <main style={{ position: 'relative', zIndex: 20, padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'white', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', boxShadow: '0 -10px 40px rgba(0,0,0,0.3)', minHeight: '40vh' }}>
        <h3 style={{ color: 'var(--color-text-muted)', margin: '0 0 1rem 0', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.9rem' }}>Támadás (Kérdés {questions.length - bossHealth + 1} / {questions.length})</h3>
        {renderExercise()}
      </main>

      {/* FOOTER: Validation Banner & Check Button */}
      <footer style={{ 
        padding: '1.5rem 2rem', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        background: feedback === 'correct' ? '#10B981' : feedback === 'incorrect' ? '#EF4444' : 'white',
        color: feedback !== 'none' ? 'white' : 'var(--color-text-main)',
        transition: 'background 0.3s',
        zIndex: 20
      }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          {feedback === 'correct' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>✓</div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Kritikus Találat!</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>Helyes válasz.</p>
              </div>
            </div>
          )}
          {feedback === 'incorrect' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
               <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>✖</div>
               <div>
                 <h3 style={{ margin: 0, fontSize: '1.2rem' }}>A Főnök Visszatámadott!</h3>
                 <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>A helyes válasz: <strong>{currentQuestion.correctAnswer || currentQuestion.answer}</strong></p>
               </div>
            </div>
          )}
        </div>
        
        <button 
          className="btn btn-primary" 
          onClick={handleCheck}
          style={{ 
            background: feedback === 'correct' ? 'white' : feedback === 'incorrect' ? 'white' : 'var(--color-accent-in)',
            color: feedback === 'correct' ? '#059669' : feedback === 'incorrect' ? '#B91C1C' : 'white',
            borderBottom: `4px solid ${feedback === 'correct' ? '#D1FAE5' : feedback === 'incorrect' ? '#FEE2E2' : 'var(--color-accent-on)'}`,
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            borderRadius: '16px',
            padding: '1rem 3rem',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            minWidth: '180px'
          }}
        >
          {feedback === 'none' ? 'Támadás!' : 'Tovább'}
        </button>
      </footer>
    </div>
  );
};
