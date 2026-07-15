export interface GuestMigrationPayload {
  points: number;
  completed: Record<string, any>;
  scores: Record<string, any>;
}

export function readGuestMigrationPayload(): GuestMigrationPayload {
  const guestDataRaw = localStorage.getItem('neolix_guest_progress');
  const legacyGuestDataRaw = localStorage.getItem('user_local_progress');
  const payload: GuestMigrationPayload = {
    points: 0,
    completed: {},
    scores: {}
  };

  if (guestDataRaw) {
    try {
      const guestData = JSON.parse(guestDataRaw);
      payload.points = Number(guestData.points) || 0;
      payload.completed = guestData.completed || {};
      payload.scores = guestData.scores || {};
    } catch (err) {
      console.warn('Hiba a vendég adatok beolvasásakor', err);
    }
    return payload;
  }

  if (legacyGuestDataRaw) {
    try {
      const legacyData = JSON.parse(legacyGuestDataRaw);
      payload.points = Number(legacyData.xpEarned) || 0;
      if (legacyData.nodeId && legacyData.completedLessonId) {
        payload.completed[legacyData.nodeId] = [legacyData.completedLessonId];
        payload.scores[legacyData.nodeId] = {
          completedLessons: [legacyData.completedLessonId],
          isComplete: legacyData.isNodeComplete
        };
      }
    } catch (err) {
      console.warn('Hiba a régi vendég adatok beolvasásakor', err);
    }
  }

  return payload;
}

export function clearGuestMigrationStorage() {
  localStorage.removeItem('user_local_progress');
  localStorage.removeItem('neolix_guest_progress');
  localStorage.removeItem('ftue_marketing_data');
}
