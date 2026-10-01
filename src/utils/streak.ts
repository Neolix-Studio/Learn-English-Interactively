// The streak rule of streakState() and countLessonDay() in api.php (B3b, #381).
// For a signed-in learner the server counts and this only shows the result a
// moment early; a guest has no server, so for a guest this is the count.

export const STREAK_SHIELD_CAP = 3;

export interface StreakState {
  streak_count: number;
  streak_shields: number;
  streak_date: string | null;
}

// The learner's calendar day, Y-m-d, in Europe/Budapest like lexipaws_activity_date().
export const streakToday = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Budapest', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

const dayNumber = (date: string): number => Math.round(Date.parse(`${date}T00:00:00Z`) / 86400000);
const isDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

// Every day missed since streak_date takes one shield, also when the shields cannot save the streak.
export const settleStreak = (state: Partial<StreakState>, today: string = streakToday()): StreakState => {
  let streak = Math.max(0, Math.floor(state.streak_count || 0));
  let shields = Math.min(STREAK_SHIELD_CAP, Math.max(0, Math.floor(state.streak_shields || 0)));
  let date = isDate(state.streak_date) ? state.streak_date : null;
  if (date !== null && date > today) date = today;

  const yesterday = dayNumber(today) - 1;
  if (date !== null && streak > 0 && dayNumber(date) < yesterday) {
    const missed = yesterday - dayNumber(date);
    const used = Math.min(shields, missed);
    shields -= used;
    if (missed > used) streak = 0;
    date = new Date(yesterday * 86400000).toISOString().slice(0, 10);
  }
  return { streak_count: streak, streak_shields: shields, streak_date: date };
};

// A completed lesson counts its day once.
export const countLessonDay = (state: Partial<StreakState>, today: string = streakToday()): StreakState => {
  const settled = settleStreak(state, today);
  if (settled.streak_date === today) return settled;
  return { ...settled, streak_count: settled.streak_count + 1, streak_date: today };
};
