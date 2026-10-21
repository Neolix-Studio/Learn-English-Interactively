import { useEffect, useRef, useState } from 'react';

// A lesson is state of the page that opened it, not a route of its own, so the system Back used to leave
// that page and throw the lesson away (C22). While it is open the lesson owns one history entry (UX0b-3,
// #397): Back takes that entry off instead, and `onBack` decides what that means, either the quit sheet
// (`ask` puts the entry back) or `leave`. Every way out goes through `leave`, which takes the entry off
// before the page's own exit runs, so the page's history is what it was before the lesson opened.
// The quit sheet is a Dialog with an entry of its own on top; Back on the sheet closes it and lands here.

const HISTORY_KEY = 'lexiLesson';

export interface LessonExit {
  /** The quit sheet is open. */
  isAsking: boolean;
  /** Open the quit sheet. */
  ask: () => void;
  /** Close the quit sheet and carry on with the lesson. */
  stay: () => void;
  /** Close the sheet if it is open, take the lesson's entry off, then run `then`, the page's own exit. */
  leave: (then: () => void) => void;
}

function createGuard(setIsAsking: (asking: boolean) => void, getOnBack: () => (exit: LessonExit) => void) {
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let asking = false;
  // The page's exit, waiting for the lesson's entry (and the sheet's above it) to come off.
  let leaving: (() => void) | null = null;
  // The unmount's release of the entry, which StrictMode's remount in development cancels.
  let release: number | null = null;

  // The sheet's entry carries this token too, since Dialog copies the state it pushes on top of.
  const onEntry = () => window.history.state?.[HISTORY_KEY] === token;
  const arm = () => {
    if (!onEntry()) window.history.pushState({ ...window.history.state, [HISTORY_KEY]: token }, '');
  };
  const setAsking = (value: boolean) => {
    asking = value;
    setIsAsking(value);
  };

  const exit = {
    ask: () => {
      arm();
      setAsking(true);
    },
    stay: () => setAsking(false),
    leave: (then: () => void) => {
      leaving = then;
      // The closing sheet takes its own entry off, and the popstate of that carries on below.
      if (asking) {
        setAsking(false);
        return;
      }
      if (onEntry()) {
        window.history.back();
        return;
      }
      leaving = null;
      then();
    },
  };

  const handlePopState = () => {
    if (leaving) {
      // Off the sheet's entry and onto the lesson's: that one comes off too. Off both: the page's exit.
      if (onEntry()) {
        window.history.back();
        return;
      }
      const then = leaving;
      leaving = null;
      then();
      return;
    }
    // Back on the sheet: the Dialog closes it, and the lesson's entry is the current one again.
    if (onEntry()) return;
    getOnBack()({ ...exit, isAsking: asking });
  };

  const mount = () => {
    if (release !== null) {
      window.clearTimeout(release);
      release = null;
    } else {
      arm();
    }
    window.addEventListener('popstate', handlePopState);
  };

  const unmount = () => {
    window.removeEventListener('popstate', handlePopState);
    // Gone without leave(), and nothing has replaced or covered the entry: take it off.
    release = window.setTimeout(() => {
      release = null;
      if (onEntry()) window.history.back();
    }, 0);
  };

  return { exit, mount, unmount };
}

export function useLessonExit(onBack: (exit: LessonExit) => void): LessonExit {
  const [isAsking, setIsAsking] = useState(false);
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;
  const [guard] = useState(() => createGuard(setIsAsking, () => onBackRef.current));

  useEffect(() => {
    guard.mount();
    return guard.unmount;
  }, [guard]);

  return { ...guard.exit, isAsking };
}
