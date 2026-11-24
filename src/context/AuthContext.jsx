import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken, UNAUTHORIZED_EVENT } from '../lib/api';

const AuthContext = createContext(null);
const USER_KEY = 'photopic_admin_user';

function savedUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; }
}

export function AuthProvider({ children }) {
  // Show the cached user immediately, then confirm the token with the server.
  const [user, setUser] = useState(() => (getToken() ? savedUser() : null));
  const [checking, setChecking] = useState(() => Boolean(getToken()));
  const [expired, setExpired] = useState(false);

  const clear = useCallback(() => {
    setToken(null);
    try { localStorage.removeItem(USER_KEY); } catch {}
    setUser(null);
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    api('/api/auth/me')
      .then(({ user }) => {
        setUser(user);
        try { localStorage.setItem(USER_KEY, JSON.stringify(user)); } catch {}
      })
      .catch((err) => {
        // Keep the cached session if the server is merely unreachable.
        if (!/reach/i.test(err.message)) { clear(); setExpired(true); }
      })
      .finally(() => setChecking(false));
  }, [clear]);

  useEffect(() => {
    const onUnauthorized = () => { clear(); setExpired(true); };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [clear]);

  // `beforeEnter` lets the login screen play its success animation before the app swaps in.
  const login = async (email, password, beforeEnter) => {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await beforeEnter?.(data.user);
    setToken(data.token);
    try { localStorage.setItem(USER_KEY, JSON.stringify(data.user)); } catch {}
    setExpired(false);
    setUser(data.user);
    return data.user;
  };

  const logout = () => { clear(); setExpired(false); };

  return (
    <AuthContext.Provider value={{ user, checking, expired, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
