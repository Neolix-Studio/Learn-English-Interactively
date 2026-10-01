// Where to go after login or signup. Only a path on this origin is followed; anything else
// (another site, //host, /\host, javascript:) lands on the fallback, so ?redirect= is not an open redirect.
export const safeRedirectPath = (raw: string | null, fallback = '/dashboard') => {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback;
  try {
    const target = new URL(raw, window.location.origin);
    if (target.origin !== window.location.origin) return fallback;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
};
