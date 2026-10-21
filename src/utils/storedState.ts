import type { UserProgressData } from '../context/UserContext';

/*
 * One shape check for every progress object the app takes in: guest progress from this device and the
 * signed-in progress get_session returns (UX3-2, #400; N4). A value of the wrong type (scores: null, a
 * string where an object belongs, an unreadable JSON string) is replaced by the default instead of being
 * spread into the state, where one bad value used to crash every route, `/` included.
 *
 * Guest progress lives under a key that carries the schema version. The old app on `main` stores its
 * guest progress under `neolix_guest_progress` on the same origins, in a shape this app does not read
 * (N5), so that key is no longer read as it is. What happens to old-app learners is Q4's decision (#374);
 * their data is left where it is.
 */

export const STATE_VERSION = 2;
export const GUEST_PROGRESS_KEY = `lexipaws_guest_progress_v${STATE_VERSION}`;
// Written by the old app on `main` and by this app before #400.
export const LEGACY_GUEST_PROGRESS_KEY = 'neolix_guest_progress';

export const LEVELS = ['A1', 'A2', 'B1', 'B2'] as const;
export const LEVEL_KEY = 'selectedLevel';

export const isObject = (value: unknown): value is Record<string, any> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

// The server stores the JSON columns as strings, and an older build may have stored a string; parse it,
// and treat what cannot be parsed as missing.
function parsed(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

export function asObject(value: unknown, fallback: Record<string, any> = {}): Record<string, any> {
  const result = parsed(value);
  return isObject(result) ? result : fallback;
}

function asList<T>(value: unknown, fallback: T[], keep: (item: unknown) => boolean = () => true): T[] {
  const result = parsed(value);
  return Array.isArray(result) ? result.filter(keep) as T[] : fallback;
}

function asCount(value: unknown, fallback: number): number;
function asCount(value: unknown, fallback: number | undefined): number | undefined;
function asCount(value: unknown, fallback: number | undefined) {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof number === 'number' && Number.isFinite(number) ? Math.max(0, number) : fallback;
}

const asText = <T extends string | null | undefined>(value: unknown, fallback: T): string | T =>
  typeof value === 'string' ? value : fallback;

const isText = (item: unknown) => typeof item === 'string';

function normalizeScores(value: unknown, fallback: UserProgressData['scores']): UserProgressData['scores'] {
  const source = asObject(value, fallback);
  const scores: Record<string, any> = { ...source };
  const setOrDrop = (key: string, result: unknown) => {
    if (result === undefined) delete scores[key];
    else scores[key] = result;
  };

  for (const key of ['level', 'streak_count', 'streak_shields', 'bones']) {
    if (key in source) setOrDrop(key, asCount(source[key], (fallback as Record<string, any>)[key]));
  }
  if ('streak_date' in source) scores.streak_date = asText(source.streak_date, null);
  for (const key of ['active_theme', 'active_nameplate']) {
    if (key in source) setOrDrop(key, asText(source[key], undefined));
  }
  if ('tutorial_done' in source) scores.tutorial_done = source.tutorial_done === true;
  if ('achievements' in source) scores.achievements = asList(source.achievements, [], isText);
  if ('earned_xp_per_node' in source) {
    const earned = asObject(source.earned_xp_per_node);
    scores.earned_xp_per_node = Object.fromEntries(
      Object.entries(earned).filter(([, xp]) => asCount(xp, undefined) !== undefined)
    );
  }
  if ('node_state' in source) {
    // Every node the path reads has a completedLessons list (Roadmap.tsx, completeLesson).
    const nodes = asObject(source.node_state);
    scores.node_state = Object.fromEntries(
      Object.entries(nodes)
        .filter(([, node]) => isObject(node))
        .map(([id, node]) => [id, { ...node, completedLessons: asList(node.completedLessons, [], isText) }])
    );
  }
  return scores;
}

// Missing or wrongly typed fields take the fallback's value; fields this build does not know are kept.
export function normalizeProgress(value: unknown, fallback: UserProgressData): UserProgressData {
  const source = asObject(value);
  const oneOf = <T extends string>(item: unknown, allowed: readonly T[], otherwise: T): T =>
    allowed.includes(item as T) ? item as T : otherwise;

  return {
    ...source,
    username: asText(source.username, fallback.username) || fallback.username,
    points: asCount(source.points, fallback.points),
    completed: asObject(source.completed, fallback.completed),
    scores: 'scores' in source ? normalizeScores(source.scores, fallback.scores) : { ...fallback.scores },
    role: oneOf(source.role, ['user', 'admin'], fallback.role),
    subscription_tier: oneOf(source.subscription_tier, ['free', 'premium', 'lifetime'], fallback.subscription_tier),
    daily_quests_date: asText(source.daily_quests_date, null),
    active_quests: asList(source.active_quests, fallback.active_quests, isObject),
    quest_progress: asObject(source.quest_progress, fallback.quest_progress),
    completed_quests_today: asList(source.completed_quests_today, fallback.completed_quests_today),
    base_language: oneOf(source.base_language, ['hu', 'sk'], fallback.base_language || 'hu'),
    avatar: asText(source.avatar, fallback.avatar ?? null),
    energy: asCount(source.energy, fallback.energy),
    last_energy_refill: asText(source.last_energy_refill, fallback.last_energy_refill),
    learnedWords: asList(source.learnedWords, fallback.learnedWords, isText),
    unlocked_themes: asList(source.unlocked_themes, fallback.unlocked_themes || [], isText),
    notification_preferences: { ...fallback.notification_preferences, ...asObject(source.notification_preferences) }
  };
}

// This app's guest progress from before #400 has learnedWords (every state it wrote did); the old app
// never wrote that field. Only the former moves to the versioned key, once.
function adoptPreVersionGuestProgress() {
  try {
    if (localStorage.getItem(GUEST_PROGRESS_KEY) !== null) return;
    const legacy = parsed(localStorage.getItem(LEGACY_GUEST_PROGRESS_KEY));
    if (!isObject(legacy) || !Array.isArray(legacy.learnedWords)) return;
    localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify(legacy));
    localStorage.removeItem(LEGACY_GUEST_PROGRESS_KEY);
  } catch {
    // Storage that cannot be read or written holds nothing to adopt.
  }
}

// The stored guest progress as an object, or null when there is none or it cannot be read.
export function readGuestProgress(): Record<string, any> | null {
  adoptPreVersionGuestProgress();
  try {
    const raw = localStorage.getItem(GUEST_PROGRESS_KEY);
    if (raw === null) return null;
    const value = parsed(raw);
    if (isObject(value)) return value;
    console.warn(`${GUEST_PROGRESS_KEY} is not a progress object; starting from the defaults`);
  } catch (e) {
    console.warn(`Could not read ${GUEST_PROGRESS_KEY}`, e);
  }
  return null;
}

export function writeGuestProgress(data: UserProgressData) {
  try {
    localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn(`Could not write ${GUEST_PROGRESS_KEY}`, e);
  }
}

export function readLevel(): string {
  try {
    const level = localStorage.getItem(LEVEL_KEY);
    return LEVELS.includes(level as typeof LEVELS[number]) ? level as string : 'A1';
  } catch {
    return 'A1';
  }
}

/*
 * What "Helyi adatok törlése" ("Delete local data") on the recovery screen removes: every key this app
 * writes, apart from three. The interface language stays (the screen is in it). The outbox and the
 * remembered account stay, so progress a signed-in learner has not saved yet is still sent; both are
 * read through a shape check and cannot crash a route. The old app's keys and anything else on the
 * origin are not touched, which is why this is a list and not localStorage.clear().
 */
export const APP_STORAGE_KEYS = [
  GUEST_PROGRESS_KEY,
  'user_local_progress',
  'ftue_marketing_data',
  'guest_character_progress',
  'neolix_active_lesson',
  LEVEL_KEY,
  'lexipaws_tour_completed',
  'hasSeenWordTooltipGuide',
  'last_feedback_refill',
  'adhd_volume',
  'neolix_reduced_motion',
  'forceBetaRequestModal'
];

export function clearAppStorage() {
  APP_STORAGE_KEYS.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Nothing to remove from storage that cannot be read.
    }
  });
}
