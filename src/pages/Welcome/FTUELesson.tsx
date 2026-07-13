import { useNavigate } from 'react-router-dom';
import { LessonPlayer } from '../../components/LessonPlayer/LessonPlayer';
import { useUser } from '../../context/UserContext';
import { getCurriculum } from '../../utils/roadmapLoader';

export function FTUELesson() {
  const navigate = useNavigate();
  const { completeLesson } = useUser();

  const curriculum = getCurriculum();
  const a1Level = curriculum.A1;
  // Module 1 is usually the first module, we can sort or find by id if needed, but since it's A1, it should be the first one.
  const module1 = a1Level?.modules.find(m => m.id === 'Module_1') || a1Level?.modules[0];
  const firstNode = module1?.nodes[0]?.originalData;

  if (!firstNode) {
    return <div>Betöltés...</div>;
  }

  const handleComplete = (scoreData: any) => {
    // Process XP, streak, energy, and bones in UserContext global state
    completeLesson(firstNode.id, scoreData.xpEarned, 100, scoreData.completedLessonId, scoreData.isNodeComplete, true);

    // Save progress to localStorage for guest
    try {
      const progress = {
        xpEarned: scoreData.xpEarned,
        completedLessonId: scoreData.completedLessonId,
        nodeId: firstNode.id,
        isNodeComplete: scoreData.isNodeComplete,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('user_local_progress', JSON.stringify(progress));
    } catch (e) {
      console.error("Failed to save local progress", e);
    }
    
    // In the future, this might redirect to a dedicated "Sign up to save" screen
    // For now, we drop them to dashboard where AuthModal should theoretically open if guest
    // Actually, we can pass a state to dashboard to open auth modal
    navigate('/dashboard', { state: { openAuth: true, fromFTUE: true } });
  };

  const handleExit = () => {
    navigate('/welcome/experience');
  };

  return (
    <LessonPlayer 
      lessonNode={firstNode}
      onExit={handleExit}
      onComplete={handleComplete}
      isTutorial={true}
    />
  );
}
