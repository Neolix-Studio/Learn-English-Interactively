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

export interface GuestProgressSummary {
  xp: number;
  bones: number;
  streak: number;
  lessons: number;
}

const toAmount = (value: unknown) => Math.max(0, Math.floor(Number(value) || 0));

// What the merge would bring into an account, or null when there is nothing worth asking about.
export function summarizeGuestProgress(payload: GuestMigrationPayload): GuestProgressSummary | null {
  const scores = payload.scores || {};
  const nodeState: Record<string, any> = scores.node_state && typeof scores.node_state === 'object' ? scores.node_state : {};

  let lessons = Object.values(nodeState).reduce(
    (sum: number, node: any) => sum + (Array.isArray(node?.completedLessons) ? node.completedLessons.length : 0),
    0
  );
  if (lessons === 0) {
    lessons = Object.values(payload.completed || {}).reduce(
      (sum: number, value: any) => sum + (Array.isArray(value) ? value.length : value ? 1 : 0),
      0
    );
  }

  const summary = {
    xp: toAmount(payload.points),
    bones: toAmount(scores.bones),
    streak: toAmount(scores.streak_count),
    lessons
  };

  return summary.xp > 0 || summary.bones > 0 || summary.streak > 0 || summary.lessons > 0 ? summary : null;
}

export function clearGuestMigrationStorage() {
  localStorage.removeItem('user_local_progress');
  localStorage.removeItem('neolix_guest_progress');
  localStorage.removeItem('ftue_marketing_data');
}

// Every key that belongs to the person rather than to the device (SOT §5). Volume, reduced motion
// and the interface language stay: they describe the device.
export const PERSONAL_STORAGE_KEYS = [
  'neolix_guest_progress',
  'user_local_progress',
  'ftue_marketing_data',
  'guest_character_progress',
  'neolix_active_lesson',
  'selectedLevel',
  'lexipaws_tour_completed',
  'hasSeenWordTooltipGuide',
  'last_feedback_refill'
];

export function clearPersonalStorage() {
  PERSONAL_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
}
