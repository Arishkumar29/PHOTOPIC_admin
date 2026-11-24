import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

const EventsContext = createContext(null);
const POLL_MS = 3000;

export function EventsProvider({ children }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState({}); // eventId -> live index status
  const pollers = useRef({});
  const drivers = useRef({}); // eventId -> true while an index-step loop runs
  const alive = useRef(true);
  const [mode, setMode] = useState('server'); // 'serverless' on Vercel: the admin drives indexing
  const modeRef = useRef('server');

  // Serverless backends can't index in the background, so this tab feeds them
  // one bounded chunk at a time until the event is ready.
  const drive = useCallback(async (eventId) => {
    if (drivers.current[eventId]) return;
    drivers.current[eventId] = true;
    let last = -1, stalled = 0;
    try {
      while (alive.current) {
        try {
          const st = await api(`/api/events/${eventId}/index-step`, { method: 'POST' });
          if (!alive.current) break;
          // Photos that keep failing (deleted, private) must not keep this loop alive forever.
          stalled = st.done === last ? stalled + 1 : 0;
          last = st.done;
          const finished = st.state === 'ready' || stalled >= 2;
          setStatus((prev) => ({ ...prev, [eventId]: { ...st, driving: !finished } }));
          if (finished) break;
        } catch (err) {
          if (/not found/i.test(err.message)) break;
          await new Promise((r) => setTimeout(r, 10000));
        }
      }
    } finally {
      delete drivers.current[eventId];
    }
  }, []);

  const watch = useCallback((eventId) => {
    if (modeRef.current === 'serverless') return drive(eventId);
    if (pollers.current[eventId]) return;
    const poll = async () => {
      try {
        const st = await api(`/api/events/${eventId}/index-status`);
        setStatus((prev) => ({ ...prev, [eventId]: st }));
        if (st.state === 'indexing') return;
      } catch { /* stop polling on errors; the card keeps its last state */ }
      clearInterval(pollers.current[eventId]);
      delete pollers.current[eventId];
    };
    pollers.current[eventId] = setInterval(poll, POLL_MS);
    poll();
  }, [drive]);

  const refresh = useCallback(async () => {
    try {
      const data = await api('/api/events');
      setEvents(data.events || []);
      setError('');
      const busy = modeRef.current === 'serverless'
        ? (e) => e.indexStatus?.state !== 'ready' && (e.indexStatus?.total ?? 1) > 0
        : (e) => e.indexStatus?.state === 'indexing';
      (data.events || []).filter(busy).forEach((e) => watch(e.eventId));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [watch]);

  useEffect(() => {
    alive.current = true;
    api('/api/health')
      .then((h) => { modeRef.current = h.mode === 'serverless' ? 'serverless' : 'server'; setMode(modeRef.current); })
      .catch(() => {})
      .finally(refresh);
    const timers = pollers.current;
    return () => { alive.current = false; Object.values(timers).forEach(clearInterval); };
  }, [refresh]);

  const statusOf = (e) => status[e.eventId] || e.indexStatus || {};

  const create = async (body) => {
    const data = await api('/api/create-event', { method: 'POST', body: JSON.stringify(body) });
    await refresh();
    watch(body.eventId);
    return data.event;
  };

  const update = async (eventId, body) => {
    const data = await api(`/api/events/${eventId}`, { method: 'PUT', body: JSON.stringify(body) });
    setEvents((prev) => prev.map((e) => (e.eventId === eventId ? data.event : e)));
    watch(eventId);
    return data.event;
  };

  const reindex = async (eventId) => {
    const data = await api(`/api/events/${eventId}/reindex`, { method: 'POST' });
    setStatus((prev) => ({ ...prev, [eventId]: data.indexStatus || { state: 'indexing' } }));
    watch(eventId);
    return data;
  };

  const remove = async (eventId) => {
    await api(`/api/events/${eventId}`, { method: 'DELETE' });
    setEvents((prev) => prev.filter((e) => e.eventId !== eventId));
  };

  const sync = async (eventId) => {
    setStatus((prev) => ({ ...prev, [eventId]: { ...(prev[eventId] || {}), state: 'indexing' } }));
    try {
      const data = await api(`/api/events/${eventId}/index-faces`, { method: 'POST' });
      setStatus((prev) => ({ ...prev, [eventId]: data.indexStatus }));
      watch(eventId);
      refresh();
      return data;
    } catch (err) {
      setStatus((prev) => ({ ...prev, [eventId]: { state: 'error', message: err.message } }));
      throw err;
    }
  };

  return (
    <EventsContext.Provider value={{ events, loading, error, mode, refresh, statusOf, create, update, remove, sync, reindex }}>
      {children}
    </EventsContext.Provider>
  );
}

export const useEvents = () => useContext(EventsContext);
