import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LessonPlayer } from '../../components/LessonPlayer/LessonPlayer';
import { useUser } from '../../context/UserContext';
import { getCurriculum } from '../../utils/roadmapLoader';

export function FTUELesson() {
  const navigate = useNavigate();
  const { completeLesson, data } = useUser();
  // Read once on mount: the lesson itself sets tutorial_done on its last answer, and must not redirect mid-PostLesson.
  const [alreadyDone] = useState(() => data.scores?.tutorial_done === true);

  // One node object for the page's life: a new one makes LessonPlayer reload, and saving the lesson re-renders this page.
  const firstNode = useMemo(() => {
    const a1Level = getCurriculum().A1;
    const module1 = a1Level?.modules.find(m => m.id === 'Module_1') || a1Level?.modules[0];
    return module1?.nodes[0]?.originalData;
  }, []);

  // A finished tutorial never replays: its rewards (energy, bones, a shield, streak 1) would be granted again.
  if (alreadyDone) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!firstNode) {
    return <div>Betöltés...</div>;
  }

  const handleCommit = (scoreData: any) => {
    completeLesson(firstNode.id, scoreData.xpEarned, scoreData.accuracy, scoreData.completedLessonId, scoreData.isNodeComplete, true);

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
  };

  const handleComplete = () => {
    // Replace, so Back from the first dashboard cannot reopen the tutorial.
    navigate('/dashboard', { replace: true, state: { openAuth: true, fromFTUE: true } });
  };

  const handleExit = () => {
    navigate('/welcome/experience');
  };

  return (
    <LessonPlayer
      lessonNode={firstNode}
      onExit={handleExit}
      onCommit={handleCommit}
      onComplete={handleComplete}
      isTutorial={true}
    />
  );
}
