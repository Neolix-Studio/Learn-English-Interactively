// Base URL for API requests. 
// During development, if you need to connect to the live server, you can change this to 'https://your-live-domain.com'
// Alternatively, configure Vite proxy in vite.config.ts if you encounter CORS issues.
export const API_BASE_URL = '';

/**
 * Example wrapper for fetch requests to the PHP backend
 */
export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}/api.php${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    // 'Authorization': `Bearer ${localStorage.getItem('token')}` // Add if using JWT
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}
