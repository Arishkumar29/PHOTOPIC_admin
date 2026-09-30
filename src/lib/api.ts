// Backend origin, e.g. https://photopic-backend.onrender.com (set VITE_API_URL at build time).
// Empty in development: Vite proxies /api to localhost:3000.
const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
if (import.meta.env.PROD && !API_BASE_URL) {
  console.error('VITE_API_URL is not set: API calls will go to this site instead of the PhotoPic backend.');
}

export function resolveMediaUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${cleanPath}` : cleanPath;
}

export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = endpoint.startsWith('http') ? endpoint : (API_BASE_URL ? `${API_BASE_URL}${cleanEndpoint}` : cleanEndpoint);
  return fetch(url, options);
}

export { API_BASE_URL };
