export interface ExerciseAnswer {
  hasAnswer: boolean;
  isCorrect: boolean;
  value: string | boolean | null;
}

export const NO_ANSWER: ExerciseAnswer = { hasAnswer: false, isCorrect: false, value: null };

export type OptionState = 'idle' | 'selected' | 'correct' | 'wrong' | 'answer';

// Neutral while the learner is choosing. Once CHECK is pressed the pick turns right or wrong
// and the right option is marked, whether it was picked or not.
export function getOptionState(isSelected: boolean, isCorrectOption: boolean, isAnswered: boolean): OptionState {
  if (!isAnswered) return isSelected ? 'selected' : 'idle';
  if (isSelected) return isCorrectOption ? 'correct' : 'wrong';
  return isCorrectOption ? 'answer' : 'idle';
}
