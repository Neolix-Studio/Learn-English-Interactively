import type { UserProgressData } from '../context/UserContext';
import { streakToday } from './streak';

/*
 * Progress the server has not got yet, kept on the device (UX3-1b, #399; N3). A signed-in save that
 * fails for any reason (an expired session, no connection, a 429 or a 500) writes what the learner has
 * now to the outbox; a save that gets through clears it. The next time a session loads for the same
 * account, on a reload, a relaunch or a sign-in, the outbox is merged into the server's progress and
 * sent. It is never sent to another account.
 *
 * Next to it the device remembers the account it was last signed in to, until a logout. A launch that
 * finds no session but a remembered account knows the session ran out, instead of treating the learner
 * as a stranger, and fills in the e-mail of the sign-in sheet.
 */

export const OUTBOX_KEY = 'lexipaws_progress_outbox';
export const ACCOUNT_KEY = 'lexipaws_account';

export interface SignedInAccount {
  id: string;
  email: string;
}

type OutboxProgress = Pick<UserProgressData, 'points' | 'completed' | 'scores' | 'quest_progress' | 'completed_quests_today' | 'active_quests' | 'daily_quests_date'>;

export interface ProgressOutbox {
  // The account's user id.
  owner: string;
  // The learner's day (Europe/Budapest) when it was last written.
  day: string;
  // A finished lesson is in it. It raises the streak only on the day it was finished.
  lesson?: true | 'tutorial';
  progress: OutboxProgress;
}

const isObject = (value: unknown): value is Record<string, any> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

function read<T>(key: string, valid: (value: any) => boolean): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const value = JSON.parse(raw);
    return valid(value) ? value as T : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Could not write ${key}`, e);
  }
}

function remove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage that cannot be read holds nothing to remove.
  }
}

export const readAccount = () =>
  read<SignedInAccount>(ACCOUNT_KEY, value => isObject(value) && typeof value.id === 'string' && typeof value.email === 'string');

export const writeAccount = (account: SignedInAccount) => write(ACCOUNT_KEY, account);

export const readOutbox = () =>
  read<ProgressOutbox>(OUTBOX_KEY, value => isObject(value) && typeof value.owner === 'string' && typeof value.day === 'string' && isObject(value.progress));

// A lesson flag already in the outbox stays while it is the same day, so a later failed save
// (after a reload, when the flag is no longer held in memory) does not drop it.
export function writeOutbox(owner: string, data: UserProgressData, lesson?: true | 'tutorial') {
  const day = streakToday();
  const previous = readOutbox();
  const keptLesson = previous && previous.owner === owner && previous.day === day ? previous.lesson : undefined;
  const outbox: ProgressOutbox = {
    owner,
    day,
    progress: {
      points: data.points,
      completed: data.completed,
      scores: data.scores,
      quest_progress: data.quest_progress,
      completed_quests_today: data.completed_quests_today,
      active_quests: data.active_quests,
      daily_quests_date: data.daily_quests_date
    }
  };
  const flag = lesson ?? keptLesson;
  if (flag) outbox.lesson = flag;
  write(OUTBOX_KEY, outbox);
}

export function clearOutbox(owner: string) {
  if (readOutbox()?.owner === owner) remove(OUTBOX_KEY);
}

// The rule mergeProgressValue() in api.php uses for guest progress: lists are joined without
// duplicates, numbers keep the larger value, objects merge key by key, and anything else takes the
// outbox's value unless it is empty. Progress made on another device in the meantime is kept, not
// overwritten by an older copy from this one; the server still clamps what it is sent.
export function mergeProgressValue(current: any, incoming: any): any {
  if (Array.isArray(current) && Array.isArray(incoming)) {
    const merged = [...current];
    incoming.forEach(item => {
      if (!merged.some(existing => JSON.stringify(existing) === JSON.stringify(item))) merged.push(item);
    });
    return merged;
  }
  if (isObject(current) && isObject(incoming)) {
    const merged = { ...current };
    Object.entries(incoming).forEach(([key, value]) => {
      merged[key] = key in merged ? mergeProgressValue(merged[key], value) : value;
    });
    return merged;
  }
  if (typeof current === 'number' && typeof incoming === 'number') return Math.max(current, incoming);
  if (incoming === null || incoming === undefined || incoming === '') return current;
  return incoming;
}

// The server's progress with the outbox on top. The daily quests are generated on the device, so the
// outbox's set replaces the server's while it is today's and is dropped once the day is over.
export function applyOutbox(server: UserProgressData, outbox: ProgressOutbox, questDay: string): UserProgressData {
  const progress = outbox.progress;
  const merged: UserProgressData = {
    ...server,
    points: mergeProgressValue(server.points || 0, progress.points || 0),
    completed: mergeProgressValue(server.completed || {}, progress.completed || {}),
    scores: mergeProgressValue(server.scores || {}, progress.scores || {})
  };
  // Purchases made since the outbox was written come off its bones, so the larger count is not one
  // with spent bones still in it (UX3-3a, #401). The counter itself is the server's.
  const serverSpent = server.scores?.bones_spent || 0;
  const outboxBones = (progress.scores?.bones || 0) - Math.max(0, serverSpent - (progress.scores?.bones_spent || 0));
  // The streak is the server's to count (B3b, #381); the outbox's copy is out of date.
  merged.scores = {
    ...merged.scores,
    bones: Math.max(server.scores?.bones || 0, outboxBones),
    bones_spent: serverSpent,
    streak_count: server.scores?.streak_count,
    streak_shields: server.scores?.streak_shields,
    streak_date: server.scores?.streak_date
  };
  if (progress.daily_quests_date === questDay && Array.isArray(progress.active_quests)) {
    merged.daily_quests_date = progress.daily_quests_date;
    merged.active_quests = progress.active_quests;
    merged.quest_progress = progress.quest_progress || {};
    merged.completed_quests_today = progress.completed_quests_today || [];
  }
  return merged;
}
