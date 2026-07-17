import { useNavigate } from 'react-router-dom';
import { LessonPlayer } from '../../components/LessonPlayer/LessonPlayer';
import { useUser } from '../../context/UserContext';
import { getCurriculum } from '../../utils/roadmapLoader';

export function FTUELesson() {
  const navigate = useNavigate();
  const { completeLesson } = useUser();

  const curriculum = getCurriculum();
  const a1Level = curriculum.A1;
  const module1 = a1Level?.modules.find(m => m.id === 'Module_1') || a1Level?.modules[0];
  const firstNode = module1?.nodes[0]?.originalData;

  if (!firstNode) {
    return <div>Betöltés...</div>;
  }

  const handleComplete = (scoreData: any) => {
    completeLesson(firstNode.id, scoreData.xpEarned, 100, scoreData.completedLessonId, scoreData.isNodeComplete, true);

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
