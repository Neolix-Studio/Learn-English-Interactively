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

async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;

  const res = await fetch('/api.php?action=csrf_token', {
    method: 'GET',
    credentials: 'same-origin'
  });
  const data = await res.json();
  const token = typeof data.csrf_token === 'string' ? data.csrf_token : '';
  csrfToken = token;
  return token;
}

export async function csrfHeader(): Promise<Record<string, string>> {
  const token = await getCsrfToken();
  return token ? { 'X-CSRF-Token': token } : {};
}

export const api = {
  async fetch(action: string, payload: any = null) {
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
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (method === 'POST') {
      Object.assign(headers, await csrfHeader());
    }

    const options: RequestInit = {
      method,
      headers,
      credentials: 'same-origin',
    };

    if (method === 'POST') {
      options.body = JSON.stringify(payload);
    }

    try {
      const res = await fetch(`/api.php?action=${requestAction}`, options);
      const data = await res.json();
      return data;
    } catch (err) {
      console.error(`API Error on action [${action}]:`, err);
      return { error: 'Hálózati hiba. Nem sikerült kapcsolódni a szerverhez.' };
    }
  }
};
