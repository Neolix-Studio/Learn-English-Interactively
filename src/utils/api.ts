import i18n from '../i18n';

let csrfToken: string | null = null;

const readOnlyActions = new Set([
  'csrf_token',
  'get_session',
  'get_leaderboard',
  'search_leaderboard',
  'get_weak_words',
  'get_pending_rewards',
  'get_vocabulary',
  'get_friends'
]);

// A request that hangs counts as offline after this long.
const REQUEST_TIMEOUT_MS = 15000;

/*
 * The one error contract (B4a, #383). api.fetch never throws: a failed request resolves to
 * an ApiFailure. httpStatus 0 means no answer at all (offline, timed out, blocked); any other
 * value is the HTTP status of a non-2xx reply, whose body is spread in. `error` is always set.
 * A 2xx reply is returned as the server sent it. api.query throws an ApiError instead, for
 * react-query, whose retry and error state only run on a rejected promise.
 */
export interface ApiFailure {
  error: string;
  httpStatus: number;
  offline?: true;
  [key: string]: any;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data: any = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }

  get offline() {
    return this.status === 0;
  }
}

export function isApiFailure(res: any): res is ApiFailure {
  return !!res && typeof res === 'object' && typeof res.httpStatus === 'number';
}

async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;

  try {
    const res = await fetch('/api.php?action=csrf_token', {
      method: 'GET',
      credentials: 'same-origin'
    });
    const data = await res.json();
    const token = typeof data.csrf_token === 'string' ? data.csrf_token : '';
    csrfToken = token || null;
    return token;
  } catch (err) {
    console.warn('Could not fetch csrf_token:', err);
    return '';
  }
}

export async function csrfHeader(): Promise<Record<string, string>> {
  const token = await getCsrfToken();
  return token ? { 'X-CSRF-Token': token } : {};
}

async function send(url: string, options: RequestInit, action: string): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    console.error(`API Error on action [${action}]:`, err);
    return { error: i18n.t('errors.offline'), httpStatus: 0, offline: true } satisfies ApiFailure;
  } finally {
    clearTimeout(timer);
  }

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (res.ok && body !== null && typeof body === 'object') {
    return body;
  }

  console.error(`API Error on action [${action}]: HTTP ${res.status}`, body);
  const fields = body && typeof body === 'object' ? body : {};
  const message = typeof fields.error === 'string' ? fields.error
    : typeof fields.message === 'string' ? fields.message
    : i18n.t('errors.server');
  // A 2xx with no JSON body is the server failing, not success.
  return { ...fields, error: message, httpStatus: res.ok ? 502 : res.status } satisfies ApiFailure;
}

// The browser refuses a keepalive request whose body, with the others in flight, passes 64 KiB.
const KEEPALIVE_MAX_BODY = 60000;

export interface FetchOptions {
  // Let the request outlive the page (pagehide, a closed tab, window.location.href). With a cached
  // CSRF token the request is dispatched before api.fetch first awaits (B4b, #384).
  keepalive?: boolean;
}

export const api = {
  async fetch(action: string, payload: any = null, fetchOptions: FetchOptions = {}): Promise<any> {
    let requestAction = action;
    const actionName = action.split('&')[0];
    const isReadOnly = readOnlyActions.has(actionName);
    if (isReadOnly && payload && typeof payload === 'object') {
      const params = new URLSearchParams();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) params.set(key, String(value));
      });
      requestAction = `${requestAction}&${params.toString()}`;
    }
    const method = payload && !isReadOnly ? 'POST' : 'GET';
    const url = `/api.php?action=${requestAction}`;

    const body = method === 'POST' ? JSON.stringify(payload) : undefined;
    const keepalive = !!fetchOptions.keepalive && (body?.length ?? 0) <= KEEPALIVE_MAX_BODY;

    const buildOptions = (csrf: Record<string, string>): RequestInit => {
      const options: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json', ...csrf },
        credentials: 'same-origin',
        keepalive,
      };
      if (body !== undefined) {
        options.body = body;
      }
      return options;
    };

    // No await when the token is cached, so a keepalive request leaves inside a pagehide handler.
    const csrf = method !== 'POST' ? {} : csrfToken ? { 'X-CSRF-Token': csrfToken } : await csrfHeader();
    let res = await send(url, buildOptions(csrf), action);

    // The cached token belongs to a session that has since ended or been replaced:
    // fetch a fresh one and try once more.
    if (method === 'POST' && isApiFailure(res) && res.httpStatus === 403) {
      csrfToken = null;
      res = await send(url, buildOptions(await csrfHeader()), action);
    }

    if (isApiFailure(res) && res.httpStatus === 401) {
      csrfToken = null;
    }

    return res;
  },

  async query(action: string, payload: any = null): Promise<any> {
    const res = await api.fetch(action, payload);
    if (isApiFailure(res)) {
      throw new ApiError(res.error, res.httpStatus, res);
    }
    return res;
  }
};
