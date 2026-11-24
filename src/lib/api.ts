// Backend origin, e.g. https://photopic-backend.onrender.com (set VITE_API_URL at build time).
// Empty in development: Vite proxies /api to localhost:3000.
const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
if (import.meta.env.PROD && !API_BASE_URL) {
  console.error('VITE_API_URL is not set: API calls will go to this site instead of the PhotoPic backend.');
}

// Guest app origin, used for share links, QR codes and the live preview.
export const GUEST_URL = (
  import.meta.env.VITE_GUEST_URL || (import.meta.env.DEV ? 'http://localhost:5173' : '')
).replace(/\/+$/, '');

export const guestLink = (eventId: string) => `${GUEST_URL}/?event=${encodeURIComponent(eventId)}`;

const TOKEN_KEY = 'photopic_admin_token';

export function getToken(): string {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* storage blocked: the session just won't survive a reload */ }
}

export function resolveMediaUrl(path: string): string {
  if (!path) return '';
  if (/^(https?:|data:)/.test(path)) return path;
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${clean}`;
}

/** Fired when the server rejects our token, so the app can return to the login screen. */
export const UNAUTHORIZED_EVENT = 'photopic:unauthorized';

export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  const token = getToken();
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(resolveMediaUrl(endpoint), { ...options, headers });
  if (res.status === 401 && token && !endpoint.includes('/auth/login')) {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
  return res;
}

/** JSON helper: throws Error(message from the API's {"error": ...}) on failure. */
export async function api<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await apiFetch(endpoint, options);
  } catch {
    throw new Error("Can't reach the PhotoPic server. Check that the backend is running.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || `Request failed (${res.status})`);
  return data as T;
}

/** URL for plain links (downloads) that can't carry an Authorization header. */
export function authedUrl(endpoint: string): string {
  const url = resolveMediaUrl(endpoint);
  const token = getToken();
  return token ? `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}` : url;
}

/** Drive thumbnails straight from Google's CDN (fast, no backend hop). */
export function driveThumb(urlOrId: string, width = 400): string {
  const id = urlOrId.includes('/') ? urlOrId.match(/\/d\/([^=/?#]+)|drive-proxy\/([^?#/]+)|[?&]id=([^&]+)/)?.slice(1).find(Boolean) : urlOrId;
  return id ? `https://lh3.googleusercontent.com/d/${id}=w${width}` : urlOrId;
}

export { API_BASE_URL };
