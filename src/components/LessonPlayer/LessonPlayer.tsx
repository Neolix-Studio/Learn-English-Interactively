import React, { useState, useEffect, useMemo } from 'react';
import { DynamicExerciseEngine, type QuestionData } from '../../utils/engine';
import { playSoundEffect, playTTS, stopAudio } from '../../utils/audio';

import { ImageChoice } from './exercises/ImageChoice';
import { WordOrder } from './exercises/WordOrder';
import { MatchPairs } from './exercises/MatchPairs';
import { FillBlanks } from './exercises/FillBlanks';
import { TrueFalse } from './exercises/TrueFalse';
import { Dictation } from './exercises/Dictation';
import { MoraleBoost } from './exercises/MoraleBoost';
import { HarderEncouragement } from './exercises/HarderEncouragement';
import { MultipleChoice } from './exercises/MultipleChoice';
import { TypeIn } from './exercises/TypeIn';

import { PhonicsListenChoose } from './exercises/PhonicsListenChoose';
import { PhonicsMatch } from './exercises/PhonicsMatch';
import { PhonicsCompare } from './exercises/PhonicsCompare';
import { PhonicsSpeak } from './exercises/PhonicsSpeak';

import { useUser } from '../../context/UserContext';
import { PostLesson } from './PostLesson';
import globalVocabulary from '../../../data/hu/vocabulary.json';
import { ReportProblemModal } from '../modals/ReportProblemModal';
import { useTranslation } from 'react-i18next';

interface LessonPlayerProps {
  lessonNode: any;
  onExit: () => void;
  onComplete: (scoreData: any) => void;
  isTutorial?: boolean;
}

export const LessonPlayer: React.FC<LessonPlayerProps> = ({ lessonNode, onExit, onComplete, isTutorial = false }) => {
  const { isGuest, data: userData, activeLevel, syncLearnedWords } = useUser();
  const { t } = useTranslation();
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [activeSubLessonId, setActiveSubLessonId] = useState<string | undefined>(undefined);
  const [isLastSubLesson, setIsLastSubLesson] = useState<boolean>(true);
  const [isReadingStory, setIsReadingStory] = useState(lessonNode?.type === 'reading_node');
  const [isStoryPeekVisible, setIsStoryPeekVisible] = useState(false);
  
  // Use global dictionary directly
  const dictionary = globalVocabulary;
  const [introducedWords, setIntroducedWords] = useState<string[]>([]);
  const [characters, setCharacters] = useState<string[]>([]);
  
  // Feedback state
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'incorrect' | 'skipped'>('none');
  const [selectedAnswerCorrect, setSelectedAnswerCorrect] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPostLesson, setIsPostLesson] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Report Problem Modal state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add('is-lesson-active');
    return () => {
      document.body.classList.remove('is-lesson-active');
      stopAudio();
    };
  }, []);

  const currentQuestion = questions[currentIndex];
  
  const enrichedQuestion = useMemo(() => {
    if (!currentQuestion) return undefined;
    
    let isNew = false;
    const newWordsInQuestion: string[] = [];
    
    if (introducedWords && introducedWords.length > 0) {
      let textContent = "";
      if (currentQuestion.correctAnswer) textContent += currentQuestion.correctAnswer + " ";
      if (currentQuestion.sentence) textContent += currentQuestion.sentence + " ";
      if (currentQuestion.options) {
        currentQuestion.options.forEach((opt: any) => {
          if (opt.text) textContent += opt.text + " ";
        });
      }
      if (currentQuestion.scrambledWords) {
         textContent += currentQuestion.scrambledWords.join(" ") + " ";
      }
      if (currentQuestion.word) {
         textContent += currentQuestion.word + " ";
      }
      
      const lowerText = textContent.toLowerCase();
      introducedWords.forEach(word => {
        const regex = new RegExp(`\\b${word.toLowerCase()}\\b`);
        if (regex.test(lowerText)) {
          // It's only a NEW word if the user hasn't learned it yet
          if (!userData.learnedWords || !userData.learnedWords.includes(word.toLowerCase())) {
            isNew = true;
            newWordsInQuestion.push(word);
          }
        }
      });
    }
    
    return { 
      ...currentQuestion, 
      dictionary,
      newWord: isNew,
      newWords: newWordsInQuestion
    };
  }, [currentQuestion, dictionary, introducedWords]);

  // Fetch and generate questions on mount
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setIsLoading(true);
        // Use the pre-loaded data directly from Vite import.meta.glob
        const data = lessonNode;
        
        let rawItems = [];
        let currentSubLessonId = undefined;
        let isLast = true;
        
        if (data.lessons && Array.isArray(data.lessons)) {
            let completedLessons: string[] = [];
            if (userData.scores?.node_state?.[lessonNode.id]) {
                completedLessons = userData.scores.node_state[lessonNode.id].completedLessons || [];
            } else if (isGuest) {
                // Fallback for legacy user_local_progress just in case
                try {
                    const localProgStr = localStorage.getItem('user_local_progress');
                    if (localProgStr) {
                        const localProg = JSON.parse(localProgStr);
                        if (localProg.nodeId === lessonNode.id && localProg.completedLessonId) {
                            completedLessons = [localProg.completedLessonId];
                        }
                    }
                } catch (e) {
                    console.error("Could not parse local progress", e);
                }
            }
            
            let targetLesson = data.lessons.find((l: any) => !completedLessons.includes(l.id));
            if (!targetLesson) {
                // If all completed, just play the last one for practice
                targetLesson = data.lessons[data.lessons.length - 1];
            }
            
            rawItems = targetLesson.items || [];
            currentSubLessonId = targetLesson.id;
            setActiveSubLessonId(currentSubLessonId);
            
            isLast = data.lessons.indexOf(targetLesson) === data.lessons.length - 1;
            setIsLastSubLesson(isLast);
            
            if (targetLesson.introducedWords) setIntroducedWords(targetLesson.introducedWords);
            
        } else if (data.levels) {
            rawItems = data.levels[0].exercises;
        } else if (data.items) {
            rawItems = data.items;
        } else if (Array.isArray(data)) {
            rawItems = data;
        }
        
        // Also load dictionary and introduced words if they exist at the root level
        if (data.introducedWords) setIntroducedWords(data.introducedWords);
        if (data.characters) setCharacters(data.characters);
        
        let generatedQuestions: QuestionData[] = [];
        
        // Check if the items are already questions (have a 'type') or just vocabulary words
        if (rawItems.length > 0 && rawItems[0].type) {
            generatedQuestions = rawItems; // Already formatted as questions
        } else {
            generatedQuestions = DynamicExerciseEngine.generate(rawItems);
        }
        
        setQuestions(generatedQuestions);
      } catch (err: any) {
        console.error("Failed to load lesson data:", err);
        setErrorMsg(err.message || String(err));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchQuestions();
  }, [lessonNode]);

  if (isLoading) {
    return <div className="screen active" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="spinner" style={{ width: '50px', height: '50px', border: '5px solid #eee', borderTopColor: 'var(--color-accent-in)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
    </div>;
  }

  if (questions.length === 0) {
    return <div className="screen active" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
      <h2>Failed to load lesson</h2>
      {errorMsg && <p style={{ color: 'red', marginTop: '1rem' }}>{errorMsg}</p>}
      <button onClick={onExit} style={{ padding: '1rem 2rem', marginTop: '1rem', background: '#e5e5e5', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
        {t('lesson.back_btn')}
      </button>
    </div>;
  }

  // Calculate completed questions (include current if feedback is showing)
  const completedQuestions = currentIndex + (feedback !== 'none' ? 1 : 0);
  const progressPercent = (completedQuestions / questions.length) * 100;

  const handleAnswerSelected = (isCorrect: boolean) => {
    setSelectedAnswerCorrect(isCorrect);
  };

  const handleSkipExercise = () => {
    stopAudio();
    setFeedback('skipped');
    playSoundEffect('success'); // Play a success sound or a neutral sound
  };

  const isInterstitial = currentQuestion?.type === 'morale_boost' || currentQuestion?.type === 'harder_encouragement';

  const handleCheck = () => {
    if (isInterstitial) {
      stopAudio(); // Cut off any playing audio when moving past an interstitial
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setIsPostLesson(true);
      }
      return;
    }

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
      
      if (textToRead && currentQuestion.targetLang !== 'hu') {
        // Clean up dialogue markers and HTML tags before sending to TTS
        const cleanText = textToRead
            .replace(/A:\s*/g, '')
            .replace(/B:\s*/g, '')
            .replace(/<br\s*\/?>/gi, '. ')
            .replace(/<[^>]*>?/gm, ''); // strip any other html
            
        playTTS(cleanText);
      }

      // User clicked "Check" after selecting an answer
      if (selectedAnswerCorrect) {
        setFeedback('correct');
        playSoundEffect('success');
      } else {
        setFeedback('incorrect');
        playSoundEffect('fail');
        setMistakes(prev => prev + 1);

        // Log mistake to backend
        if (!isGuest && !isTutorial) {
          import('../../utils/api').then(({ api }) => {
            api.fetch('log_failed_exercise', {
              level: activeLevel || 'A1',
              exercise_id: currentQuestion.id || `${activeSubLessonId}_${currentIndex}`,
              question_data: currentQuestion
            });
          }).catch(console.error);
        }
      }
    } else {
      // User clicked "Continue" after seeing feedback
      stopAudio(); // Cut off any playing sentence audio when advancing to next question
      setFeedback('none');
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(prev => prev + 1);
      } else {
        // Trigger post lesson screen
        setIsPostLesson(true);
      }
    }
  };

  const renderExercise = () => {
    if (!enrichedQuestion) return null;
    
    switch (currentQuestion.type) {
      case 'image_choice':
        return <ImageChoice question={enrichedQuestion} onAnswer={handleAnswerSelected} />;
      case 'word_order':
        return <WordOrder question={enrichedQuestion} onAnswer={handleAnswerSelected} />;
      case 'match_pairs':
        return <MatchPairs question={enrichedQuestion} onAnswer={handleAnswerSelected} />;
      case 'fill_blanks':
        return <FillBlanks question={enrichedQuestion} onAnswer={handleAnswerSelected} />;
      case 'true_false':
        return <TrueFalse question={enrichedQuestion} onAnswer={handleAnswerSelected} />;
      case 'multiple_choice':
        return <MultipleChoice question={enrichedQuestion} onAnswer={handleAnswerSelected} />;
      case 'type_in':
        return <TypeIn question={enrichedQuestion} onAnswer={handleAnswerSelected} />;
      case 'dictation':
        return <Dictation question={enrichedQuestion} onAnswer={handleAnswerSelected} />;
      case 'sentence_builder':
        return <FillBlanks question={enrichedQuestion} onAnswer={handleAnswerSelected} />;
      case 'morale_boost':
        return <MoraleBoost question={enrichedQuestion} onAnswer={handleAnswerSelected} />;
      case 'harder_encouragement':
        return <HarderEncouragement question={enrichedQuestion} onAnswer={handleAnswerSelected} />;
      case 'phonics_listen_choose':
        return <PhonicsListenChoose question={enrichedQuestion} onAnswer={handleAnswerSelected} />;
      case 'phonics_match':
        return <PhonicsMatch question={enrichedQuestion} onAnswer={handleAnswerSelected} />;
      case 'phonics_compare':
        return <PhonicsCompare question={enrichedQuestion} onAnswer={handleAnswerSelected} isAnswered={feedback !== 'none'} />;
      case 'phonics_speak':
        return <PhonicsSpeak question={enrichedQuestion} onAnswer={handleAnswerSelected} onSkip={handleSkipExercise} isAnswered={feedback !== 'none'} />;
      default:
        return <div>Ismeretlen feladattípus: {currentQuestion.type}</div>;
    }
  };

  if (isReadingStory && lessonNode.story) {
    return (
      <div className="screen active interactive-active" style={{ background: 'var(--color-bg-base)', display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', position: 'fixed', top: 0, left: 0, zIndex: 1000, overflowY: 'auto' }}>
        <header style={{ display: 'flex', alignItems: 'center', padding: '1rem 2rem', gap: '2rem', background: 'var(--color-bg-surface)', borderBottom: 'var(--glass-border)' }}>
          <button className="interactive-close-btn" onClick={onExit} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text-muted)' }}>✖</button>
          <div style={{ flex: 1, textAlign: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>📖 {lessonNode.title || t('lesson.story_title')}</div>
        </header>
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '2rem' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', background: 'var(--color-bg-surface)', padding: '3rem', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem', textAlign: 'center', color: 'var(--color-text-main)' }}>{lessonNode.title}</h1>
            <p style={{ fontSize: '1.5rem', lineHeight: '2.2rem', color: 'var(--color-text-main)', marginBottom: '2rem' }}>{lessonNode.story.en}</p>
            <div style={{ padding: '1.5rem', background: 'var(--color-bg-base)', borderRadius: '16px', borderLeft: '4px solid var(--color-accent-in)' }}>
                <p style={{ fontSize: '1.2rem', lineHeight: '1.8rem', color: 'var(--color-text-muted)', margin: 0 }}>{lessonNode.story.hu}</p>
            </div>
            
            <button 
              onClick={() => setIsReadingStory(false)}
              style={{
                width: '100%', marginTop: '3rem', padding: '1.5rem', fontSize: '1.5rem', fontWeight: 800,
                background: 'var(--color-accent-in)', color: 'white', border: 'none', borderRadius: '16px',
                cursor: 'pointer', boxShadow: '0 4px 0 var(--color-accent-on)', transition: 'transform 0.1s'
              }}
              onMouseDown={e => { e.currentTarget.style.transform = 'translateY(4px)'; e.currentTarget.style.boxShadow = 'none'; }}
              onMouseUp={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 0 var(--color-accent-on)'; }}
            >
              {t('lesson.continue_to_questions')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isPostLesson) {
    return (
      <div className="screen active interactive-active" style={{ background: 'var(--color-bg-base)', display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', position: 'fixed', top: 0, left: 0, zIndex: 1000 }}>
        <PostLesson 
          baseXp={15} 
          accuracy={Math.max(0, 100 - (mistakes * 20))}
          isGuest={isGuest}
          isTutorial={isTutorial || userData.points === 0}
          isCharacterLesson={lessonNode.id.startsWith('char_lesson_')}
          onComplete={() => {
            if (introducedWords && introducedWords.length > 0) {
              syncLearnedWords(introducedWords);
            }
            onComplete({ 
              xpEarned: Math.max(5, 15 - mistakes), 
              perfect: mistakes === 0,
              completedLessonId: activeSubLessonId,
              isNodeComplete: isLastSubLesson,
              isTutorial: isTutorial || userData.points === 0,
              characters: characters
            });
          }}
        />
      </div>
    );
  }

  return (
    <div className="screen active interactive-active" style={{ background: 'var(--color-bg-base)', display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', position: 'fixed', top: 0, left: 0, zIndex: 1000 }}>
      
      {/* HEADER: Progress Bar */}
      <header className="interactive-header" style={{ display: 'flex', alignItems: 'center', padding: '1rem 2rem', gap: '2rem', background: 'var(--color-bg-surface)', borderBottom: 'var(--glass-border)' }}>
        <button className="interactive-close-btn" onClick={onExit} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text-muted)' }}>✖</button>
        <div className="interactive-progress-bar" style={{ 
          flex: 1, 
          height: '16px', 
          background: 'var(--color-bg-base)', 
          borderRadius: '8px', 
          position: 'relative',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' 
        }}>
          <div className="interactive-progress-fill" style={{ 
            width: `${progressPercent}%`, 
            height: '100%', 
            borderRadius: '8px',
            background: 'linear-gradient(180deg, #81C784 0%, #4CAF50 100%)', 
            boxShadow: 'inset 0 2px 3px rgba(255,255,255,0.5), inset 0 -2px 3px rgba(0,0,0,0.2), 0 2px 6px rgba(76, 175, 80, 0.4)',
            transition: 'width 0.3s ease',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, height: '40%',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 100%)',
                borderRadius: '8px 8px 0 0'
            }}></div>
          </div>
        </div>
        {lessonNode?.type === 'reading_node' && lessonNode?.story && (
          <button 
            onClick={() => setIsStoryPeekVisible(!isStoryPeekVisible)}
            style={{
              padding: '0.5rem 1rem', background: isStoryPeekVisible ? 'var(--color-accent-in)' : 'var(--color-bg-base)',
              color: isStoryPeekVisible ? 'white' : 'var(--color-text-main)', border: 'none', borderRadius: '12px',
              cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transition: 'all 0.2s', whiteSpace: 'nowrap'
            }}
          >
            {t('lesson.story_btn')}
          </button>
        )}
        <button 
          onClick={() => setIsReportModalOpen(true)}
          style={{
            background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}
          title={t('lesson.report_problem')}
        >
          🚩
        </button>
      </header>

      {/* MIDDLE: Exercise Content */}
      <main className="interactive-main">
        
        {/* Story Peek Bubble */}
        {isStoryPeekVisible && lessonNode?.story && (
          <div style={{
            position: 'absolute', top: '1rem', right: '1rem', zIndex: 10, width: '400px', maxWidth: '90%',
            background: 'var(--color-bg-surface)', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            border: 'var(--glass-border)', maxHeight: '50vh', overflowY: 'auto'
          }}>
            <h4 style={{ marginTop: 0, color: 'var(--color-text-main)' }}>{lessonNode.title}</h4>
            <p style={{ fontSize: '1rem', lineHeight: '1.5rem', color: 'var(--color-text-main)' }}>{lessonNode.story.en}</p>
            <hr style={{ border: 'none', borderTop: 'var(--glass-border)', margin: '1rem 0' }}/>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', margin: 0 }}>{lessonNode.story.hu}</p>
          </div>
        )}
        {currentQuestion.newWord && (
          <div style={{
            marginBottom: '2rem',
            background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
            color: 'white',
            padding: '0.5rem 1.5rem',
            borderRadius: '20px',
            fontWeight: '900',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 15px rgba(126, 34, 206, 0.4)',
            border: '2px solid rgba(255, 255, 255, 0.2)'
          }}>
            <span style={{ fontSize: '1.2rem' }}>✨</span> {t('lesson.new_word')}
          </div>
        )}
        {renderExercise()}
      </main>

      {/* FOOTER: Validation Banner & Check Button */}
      <footer style={{ 
        padding: '1.5rem 2rem', 
        borderTop: 'var(--glass-border)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        background: feedback === 'correct' ? 'rgba(16, 185, 129, 0.1)' : feedback === 'incorrect' ? 'rgba(239, 68, 68, 0.1)' : feedback === 'skipped' ? 'rgba(245, 158, 11, 0.1)' : 'var(--color-bg-surface)',
        transition: 'background 0.3s'
      }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          {feedback === 'correct' && (
            <div style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '40px', height: '40px', background: '#10B981', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>✓</div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{t('lesson.correct_title')}</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>{t('lesson.correct_desc')}</p>
              </div>
            </div>
          )}
          {feedback === 'incorrect' && (
            <div style={{ color: '#B91C1C', display: 'flex', alignItems: 'center', gap: '1rem' }}>
               <div style={{ width: '40px', height: '40px', background: '#EF4444', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>✖</div>
               <div>
                 <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{t('lesson.incorrect_title')}</h3>
                 <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>{t('lesson.incorrect_desc')} <strong>{currentQuestion.correctAnswer || currentQuestion.answer}</strong></p>
               </div>
            </div>
          )}
          {feedback === 'skipped' && (
            <div style={{ color: '#D97706', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '40px', height: '40px', background: '#F59E0B', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>✓</div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{t('lesson.skipped_title')}</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>{t('lesson.skipped_desc')}</p>
              </div>
            </div>
          )}
        </div>
        
        <button 
          className="btn btn-primary" 
          onClick={handleCheck}
          style={{ 
            background: (feedback === 'correct' || isInterstitial) ? '#10B981' : feedback === 'incorrect' ? '#EF4444' : feedback === 'skipped' ? '#F59E0B' : 'var(--color-accent-in)',
            borderBottom: `4px solid ${(feedback === 'correct' || isInterstitial) ? '#059669' : feedback === 'incorrect' ? '#B91C1C' : feedback === 'skipped' ? '#D97706' : 'var(--color-accent-on)'}`,
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            borderRadius: '16px',
            padding: '1rem 3rem',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            color: 'white',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            minWidth: '180px'
          }}
        >
          {isInterstitial || feedback !== 'none' ? t('lesson.continue_btn') : t('lesson.check_btn')}
        </button>
      </footer>
      
      <ReportProblemModal 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)} 
        contextData={{
          lessonId: lessonNode?.id,
          questionIndex: currentIndex,
          questionType: currentQuestion?.type,
          questionText: currentQuestion?.question || currentQuestion?.sentence,
          username: userData?.username
        }}
      />
    </div>
  );
};
