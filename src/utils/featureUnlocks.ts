export const LEADERBOARD_UNLOCK_XP = 150;

export const isLeaderboardUnlocked = (points?: number | null) => {
  return (points || 0) >= LEADERBOARD_UNLOCK_XP;
};
