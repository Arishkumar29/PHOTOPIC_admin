import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LayoutGrid, PlusCircle, MonitorSmartphone, BarChart3, Settings as SettingsIcon, LogOut, Menu, X, Search, CornerDownLeft, Loader2, Users } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { EventsProvider, useEvents } from './context/EventsContext';
import { FeedbackProvider } from './components/ui';
import { Login } from './views/Login';
import { Dashboard } from './views/Dashboard';
import { CreateEvent } from './views/CreateEvent';
import { LivePreview } from './views/LivePreview';
import { Analytics } from './views/Analytics';
import { Settings } from './views/Settings';
import { People } from './views/People';

const NAV = [
  { id: 'overview', label: 'Galleries', icon: LayoutGrid },
  { id: 'new', label: 'New event', icon: PlusCircle },
  { id: 'people', label: 'People', icon: Users },
  { id: 'preview', label: 'Live preview', icon: MonitorSmartphone },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

// Hash routes: #overview, #new, #people/<eventId>, #preview/<eventId>, #analytics/<eventId>, #settings
function readRoute() {
  const [page, param] = window.location.hash.replace(/^#\/?/, '').split('/');
  return { page: NAV.some((n) => n.id === page) ? page : 'overview', param: param ? decodeURIComponent(param) : '' };
}

function useRoute() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const onHash = () => { setRoute(readRoute()); document.getElementById('main')?.scrollTo({ top: 0 }); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const go = (page, param) => { window.location.hash = param ? `${page}/${encodeURIComponent(param)}` : page; };
  return [route, go];
}

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'A';
}

function CommandPalette({ open, onClose, go }) {
  const { events } = useEvents();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => { if (open) { setQ(''); setActive(0); setTimeout(() => inputRef.current?.focus(), 30); } }, [open]);

  const items = useMemo(() => {
    const pages = NAV.map((n) => ({ key: n.id, label: n.label, hint: 'Page', icon: n.icon, run: () => go(n.id) }));
    const evs = events.flatMap((e) => [
      { key: `p-${e.eventId}`, label: e.eventName, hint: 'Preview as guest', icon: MonitorSmartphone, run: () => go('preview', e.eventId) },
      { key: `u-${e.eventId}`, label: e.eventName, hint: 'People', icon: Users, run: () => go('people', e.eventId) },
      { key: `a-${e.eventId}`, label: e.eventName, hint: 'Analytics', icon: BarChart3, run: () => go('analytics', e.eventId) },
    ]);
    const all = [...pages, ...evs];
    const needle = q.trim().toLowerCase();
    return needle ? all.filter((i) => `${i.label} ${i.hint}`.toLowerCase().includes(needle)) : all.slice(0, 9);
  }, [events, q, go]);

  const run = (item) => { item?.run(); onClose(); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80] bg-ink/30 backdrop-blur-[2px] flex items-start justify-center pt-[14vh] px-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div initial={{ y: -12, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: -8, scale: 0.98 }}
            className="w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-line overflow-hidden">
            <div className="flex items-center gap-3 px-4 border-b border-line">
              <Search className="w-4 h-4 text-ink-3" />
              <input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setActive(0); }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
                  if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
                  if (e.key === 'Enter') run(items[active]);
                  if (e.key === 'Escape') onClose();
                }}
                placeholder="Jump to a page or event…" className="flex-1 py-4 bg-transparent outline-none text-[15px]" />
              <kbd className="text-[10px] font-bold text-ink-3 border border-line rounded px-1.5 py-0.5">ESC</kbd>
            </div>
            <ul className="max-h-[50vh] overflow-y-auto p-2">
              {items.length === 0 && <li className="px-3 py-6 text-center text-sm text-ink-3">Nothing matches "{q}"</li>}
              {items.map((item, i) => (
                <li key={item.key}>
                  <button onMouseEnter={() => setActive(i)} onClick={() => run(item)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm ${i === active ? 'bg-paper-2' : ''}`}>
                    <item.icon className="w-4 h-4 text-ink-3 shrink-0" />
                    <span className="font-semibold truncate">{item.label}</span>
                    <span className="ml-auto text-xs text-ink-3 shrink-0">{item.hint}</span>
                    {i === active && <CornerDownLeft className="w-3.5 h-3.5 text-ink-3 shrink-0" />}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Sidebar({ page, go, onNavigate }) {
  const { user, logout } = useAuth();
  const { events } = useEvents();
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-7 pb-6 border-b border-line">
        <img src="/logo.png" alt="GWC DATA.AI" className="h-9 w-auto" />
        <p className="eyebrow mt-4">PhotoPic · Organizer desk</p>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-0.5" aria-label="Main">
        {NAV.map((n, i) => {
          const active = page === n.id;
          return (
            <button key={n.id} onClick={() => { go(n.id); onNavigate?.(); }} aria-current={active ? 'page' : undefined}
              className={`relative w-full flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-xl text-[14px] font-semibold text-left transition-colors ${active ? 'text-ink' : 'text-ink-2 hover:text-ink hover:bg-paper-2/70'}`}>
              {active && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-xl bg-card border border-line shadow-[0_2px_10px_-4px_rgba(29,26,23,.15)]" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <span className={`relative font-display text-[13px] tabular-nums w-5 ${active ? 'text-coral' : 'text-ink-3'}`}>{String(i + 1).padStart(2, '0')}</span>
              <n.icon className={`relative w-4 h-4 ${active ? 'text-plum' : 'text-ink-3'}`} />
              <span className="relative">{n.label}</span>
              {n.id === 'overview' && events.length > 0 && <span className="relative ml-auto text-[11px] font-bold text-ink-3 tabular-nums">{events.length}</span>}
            </button>
          );
        })}
      </nav>

      <div className="m-3 p-3 rounded-2xl border border-line bg-card flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-plum text-white grid place-items-center text-xs font-bold shrink-0">{initials(user?.name)}</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold truncate">{user?.name}</p>
          <p className="text-[11px] text-ink-3 truncate">{user?.email}</p>
        </div>
        <button onClick={logout} title="Sign out" aria-label="Sign out" className="p-2 rounded-lg text-ink-3 hover:text-rust hover:bg-rust-soft">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function Shell() {
  const [{ page, param }, go] = useRoute();
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const views = {
    overview: <Dashboard go={go} />,
    new: <CreateEvent go={go} />,
    people: <People eventId={param} go={go} />,
    preview: <LivePreview eventId={param} go={go} />,
    analytics: <Analytics eventId={param} go={go} />,
    settings: <Settings />,
  };

  return (
    <div className="min-h-screen bg-paper paper-grain lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="hidden lg:block sticky top-0 h-screen border-r border-line bg-paper">
        <Sidebar page={page} go={go} />
      </aside>

      {/* Mobile top bar + drawer */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-16 bg-paper/90 backdrop-blur border-b border-line">
        <img src="/logo.png" alt="GWC DATA.AI" className="h-8 w-auto" />
        <div className="flex items-center gap-1">
          <button onClick={() => setPalette(true)} className="p-2.5 rounded-lg hover:bg-paper-2" aria-label="Search"><Search className="w-5 h-5" /></button>
          <button onClick={() => setDrawer(true)} className="p-2.5 rounded-lg hover:bg-paper-2" aria-label="Open menu"><Menu className="w-5 h-5" /></button>
        </div>
      </header>
      <AnimatePresence>
        {drawer && (
          <motion.div className="lg:hidden fixed inset-0 z-50 bg-ink/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)}>
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute inset-y-0 left-0 w-[82%] max-w-[300px] bg-paper shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setDrawer(false)} className="absolute top-5 right-4 p-2 rounded-lg hover:bg-paper-2" aria-label="Close menu"><X className="w-5 h-5" /></button>
              <Sidebar page={page} go={go} onNavigate={() => setDrawer(false)} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <main id="main" className="min-w-0 overflow-x-clip">
        <div className="hidden lg:flex justify-end px-10 pt-6">
          <button onClick={() => setPalette(true)} className="flex items-center gap-3 pl-3 pr-2 py-1.5 rounded-full border border-line bg-card text-sm text-ink-3 hover:border-ink-3 transition-colors">
            <Search className="w-4 h-4" /> Jump to…
            <kbd className="text-[10px] font-bold border border-line rounded-md px-1.5 py-0.5 bg-paper">Ctrl K</kbd>
          </button>
        </div>
        <div className="px-4 sm:px-8 lg:px-10 py-8 lg:pt-4 pb-20 max-w-[1320px] mx-auto">
          <AnimatePresence mode="wait">
            <motion.div key={page} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
              {views[page]}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <CommandPalette open={palette} onClose={() => setPalette(false)} go={go} />
    </div>
  );
}

export default function App() {
  const { user, checking } = useAuth();
  if (checking && !user) {
    return <div className="min-h-screen grid place-items-center bg-paper"><Loader2 className="w-6 h-6 animate-spin text-plum" /></div>;
  }
  return (
    <FeedbackProvider>
      {user ? <EventsProvider><Shell /></EventsProvider> : <Login />}
    </FeedbackProvider>
  );
}
