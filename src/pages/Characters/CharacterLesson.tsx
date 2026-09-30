import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LessonPlayer } from '../../components/LessonPlayer/LessonPlayer';
import { useUser } from '../../context/UserContext';

const characterModules = import.meta.glob('../../../data/**/characters/*.json', { eager: true });

export function CharacterLesson() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { completeLesson, data } = useUser();
  const lang = data.base_language || 'hu';

  // One node object per lesson: a new one makes LessonPlayer reload, and saving the lesson re-renders this page.
  const charNode = useMemo(() => {
    const path = `../../../data/${lang}/characters/${id}.json`;
    const charData = (characterModules[path] as any)?.default || characterModules[path] || {};
    return { id: `char_lesson_${id}`, ...charData };
  }, [id, lang]);

  const handleCommit = (scoreData: any) => {
    completeLesson(charNode.id, scoreData.xpEarned, scoreData.accuracy, scoreData.completedLessonId, true, false);

    try {
      const localCharProgress = JSON.parse(localStorage.getItem('guest_character_progress') || '{}');
      if (scoreData.characters && scoreData.characters.length > 0) {
        scoreData.characters.forEach((char: string) => {
          const currentLevel = localCharProgress[char] || 0;
          localCharProgress[char] = Math.min(currentLevel + 1, 5);
        });
      } else {
        const chars = id?.replace('_pairs', '').split('_') || [];
        chars.forEach((char: string) => {
          const currentLevel = localCharProgress[char] || 0;
          localCharProgress[char] = Math.min(currentLevel + 1, 5);
        });
      }
      localStorage.setItem('guest_character_progress', JSON.stringify(localCharProgress));
    } catch (e) {
      console.error(e);
    }
  };

  const handleComplete = (scoreData: any) => {
    navigate('/characters', { state: { updatedCharacters: scoreData.characters || id?.replace('_pairs', '').split('_') || [] } });
  };

  const handleExit = () => {
    navigate('/characters');
  };

  return (
    <LessonPlayer
      lessonNode={charNode}
      onExit={handleExit}
      onCommit={handleCommit}
      onComplete={handleComplete}
      isTutorial={false}
    />
  );
}
