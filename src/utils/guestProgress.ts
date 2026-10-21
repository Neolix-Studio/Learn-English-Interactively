import { ACCOUNT_KEY, OUTBOX_KEY } from './progressOutbox';
import { GUEST_PROGRESS_KEY, LEVEL_KEY, asObject, readGuestProgress } from './storedState';

export interface GuestMigrationPayload {
  points: number;
  completed: Record<string, any>;
  scores: Record<string, any>;
}

export function readGuestMigrationPayload(): GuestMigrationPayload {
  const guestData = readGuestProgress();
  const legacyGuestDataRaw = localStorage.getItem('user_local_progress');
  const payload: GuestMigrationPayload = {
    points: 0,
    completed: {},
    scores: {}
  };

  if (guestData) {
    payload.points = Math.max(0, Number(guestData.points) || 0);
    payload.completed = asObject(guestData.completed);
    payload.scores = asObject(guestData.scores);
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
  localStorage.removeItem(GUEST_PROGRESS_KEY);
  localStorage.removeItem('ftue_marketing_data');
}

// Every key that belongs to the person rather than to the device (SOT §5). Volume, reduced motion
// and the interface language stay: they describe the device.
export const PERSONAL_STORAGE_KEYS = [
  GUEST_PROGRESS_KEY,
  'user_local_progress',
  'ftue_marketing_data',
  'guest_character_progress',
  'neolix_active_lesson',
  LEVEL_KEY,
  'lexipaws_tour_completed',
  'hasSeenWordTooltipGuide',
  'last_feedback_refill',
  // UX3-1b, #399: a logout forgets the account and drops what it left unsaved, as the learner chose to.
  OUTBOX_KEY,
  ACCOUNT_KEY
];

export function clearPersonalStorage() {
  PERSONAL_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
}
