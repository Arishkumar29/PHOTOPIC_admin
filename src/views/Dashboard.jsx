import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowUpRight, BarChart3, Calendar, Download, ImageOff, LayoutGrid, List, MapPin, MonitorSmartphone,
  MoreHorizontal, Pencil, Plus, QrCode, RefreshCw, Search, Trash2, AlertTriangle, Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEvents } from '../context/EventsContext';
import { api, authedUrl, driveThumb } from '../lib/api';
import { CountUp, Segmented, StatusPill, Tilt, useFeedback } from '../components/ui';
import { EditEventModal, ShareModal } from '../components/EventModals';
import { Bubble, Mascot, MascotState } from '../components/Mascot';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'ready', label: 'Ready' },
  { value: 'busy', label: 'Indexing' },
  { value: 'attention', label: 'Needs sync' },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning,' : h < 17 ? 'Good afternoon,' : 'Good evening,';
}

function formatDate(e) {
  const raw = e.eventDate || e.createdAt;
  if (!raw) return '';
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function ActionMenu({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="p-2 rounded-full text-ink-2 hover:text-ink hover:bg-paper-2" aria-label="More actions" aria-expanded={open}>
        <MoreHorizontal className="w-4 h-4" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 bottom-full mb-2 w-52 p-1.5 rounded-2xl bg-card border border-line shadow-xl z-20 origin-bottom-right">
            {items.map((it) => (
              <button key={it.label} disabled={it.disabled} onClick={() => { setOpen(false); it.onClick(); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-left disabled:opacity-40 ${it.danger ? 'text-rust hover:bg-rust-soft' : 'text-ink-2 hover:text-ink hover:bg-paper-2'}`}>
                <it.icon className="w-4 h-4" /> {it.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Progress bar with the GWC kid riding the leading edge.
export function RocketProgress({ pct, label }) {
  const w = Math.max(pct, 4);
  return (
    <div className="mt-4">
      <div className="relative h-1.5 rounded-full bg-paper-2">
        <motion.div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-plum to-coral" animate={{ width: `${w}%` }} transition={{ ease: 'easeOut', duration: 0.6 }} />
        <motion.img src="/mascot_rocket.webp" alt="" aria-hidden
          className="absolute -top-[18px] w-11 h-auto pointer-events-none -translate-x-[70%] drop-shadow"
          animate={{ left: `${w}%`, y: [0, -2, 0] }}
          transition={{ left: { ease: 'easeOut', duration: 0.6 }, y: { duration: 0.8, repeat: Infinity } }} />
      </div>
      <p className="text-[11px] text-ink-3 mt-2">{label}</p>
    </div>
  );
}

function EventCard({ event, status, index, layout, onShare, onEdit, onSync, onDelete, go, serverless }) {
  const photos = event.photos || [];
  const count = status.total ?? photos.length;
  const pct = status.total ? Math.round(((status.done || 0) / status.total) * 100) : 0;
  const busy = status.state === 'indexing' || Boolean(status.driving);
  const strip = photos.slice(0, 4);

  const menu = [
    { label: busy ? 'Syncing…' : 'Sync photos from Drive', icon: RefreshCw, onClick: onSync, disabled: busy },
    { label: 'Edit details', icon: Pencil, onClick: onEdit },
    { label: 'People in this event', icon: Users, onClick: () => go('people', event.eventId) },
    { label: 'View analytics', icon: BarChart3, onClick: () => go('analytics', event.eventId) },
    { label: 'Download all (ZIP)', icon: Download, onClick: () => { window.location.href = authedUrl(`/api/events/${event.eventId}/download-zip`); } },
    { label: 'Delete event', icon: Trash2, onClick: onDelete, danger: true },
  ];

  const meta = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3 font-medium">
      {formatDate(event) && <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(event)}</span>}
      {event.eventLocation && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{event.eventLocation}</span>}
      <span>{count.toLocaleString()} photos</span>
    </div>
  );

  const actions = (
    <div className="flex items-center gap-1.5">
      <button onClick={onShare} className="btn-ghost px-3.5 py-2 text-xs"><QrCode className="w-3.5 h-3.5" /> Share</button>
      <button onClick={() => go('preview', event.eventId)} className="btn-quiet px-3 py-2 text-xs"><MonitorSmartphone className="w-3.5 h-3.5" /> Preview</button>
      <ActionMenu items={menu} />
    </div>
  );

  const progress = busy && (
    <RocketProgress pct={pct} label={`Finding faces · ${status.done ?? 0} of ${status.total ?? '…'}${serverless ? ' · keep this tab open' : ' · guests can already scan'}`} />
  );
  const failure = status.state === 'error' && <p className="mt-3 text-xs font-semibold text-rust flex gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0" />{status.message}</p>;

  if (layout === 'list') {
    return (
      <motion.li layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: Math.min(index, 8) * 0.03 }}
        className="flex flex-col sm:flex-row sm:items-center gap-4 py-4 border-b border-line">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <img src={event.coverImage || (strip[0] && driveThumb(strip[0], 200))} alt="" className="w-16 h-12 rounded-lg object-cover bg-paper-2 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap"><h3 className="display text-lg truncate">{event.eventName}</h3><StatusPill status={status} /></div>
            {meta}
            {progress}{failure}
          </div>
        </div>
        {actions}
      </motion.li>
    );
  }

  return (
    <motion.li layout initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.45, delay: Math.min(index, 8) * 0.05, ease: [0.22, 1, 0.36, 1] }} className="group">
      <article className="card overflow-visible h-full flex flex-col transition-shadow duration-300 hover:shadow-[0_24px_50px_-28px_rgba(29,26,23,.45)]">
        <Tilt max={4} className="rounded-t-2xl">
          <button onClick={() => go('preview', event.eventId)} className="block w-full aspect-[16/10] rounded-t-2xl overflow-hidden bg-paper-2 relative" aria-label={`Preview ${event.eventName}`}>
            {event.coverImage
              ? <img src={event.coverImage} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
              : <span className="w-full h-full grid place-items-center text-ink-3"><ImageOff className="w-6 h-6" /></span>}
            <span className="absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-transparent" />
            <span className="absolute top-3 left-3"><StatusPill status={status} className="shadow-sm" /></span>
            {event.eventType && <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/90">{event.eventType}</span>}
            {strip.length > 0 && (
              <span className="absolute bottom-3 left-3 flex -space-x-2">
                {strip.map((p, i) => (
                  <img key={p} src={driveThumb(p, 120)} alt="" loading="lazy" referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-md object-cover ring-2 ring-card transition-transform duration-300 group-hover:translate-y-[-3px]"
                    style={{ transitionDelay: `${i * 40}ms` }} />
                ))}
              </span>
            )}
            <span className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-card/95 text-ink grid place-items-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </button>
        </Tilt>
        <div className="p-5 flex-1 flex flex-col">
          <p className="eyebrow mb-1.5">{event.orgName || 'Organizer'}</p>
          <h3 className="display text-[22px] leading-snug mb-2"><span className="ink-underline">{event.eventName}</span></h3>
          {meta}
          {progress}{failure}
          <div className="mt-auto pt-4 border-t border-line mt-4 flex items-center justify-between">{actions}</div>
        </div>
      </article>
    </motion.li>
  );
}

export function Dashboard({ go }) {
  const { user } = useAuth();
  const { events, loading, error, statusOf, sync, remove, mode } = useEvents();
  const { toast, confirm } = useFeedback();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [layout, setLayout] = useState(() => { try { return localStorage.getItem('photopic_admin_layout') || 'grid'; } catch { return 'grid'; } });
  const [stats, setStats] = useState(null);
  const [editing, setEditing] = useState(null);
  const [sharing, setSharing] = useState(null);

  useEffect(() => { api('/api/analytics?period=30').then(setStats).catch(() => {}); }, []);
  useEffect(() => { try { localStorage.setItem('photopic_admin_layout', layout); } catch {} }, [layout]);

  const totals = useMemo(() => events.reduce((acc, e) => {
    const st = statusOf(e);
    acc.photos += st.total ?? (e.photos?.length || 0);
    acc.faces += st.faces || 0;
    return acc;
  }, { photos: 0, faces: 0 }), [events, statusOf]);

  const shown = events.filter((e) => {
    const st = statusOf(e).state;
    if (filter === 'ready' && st !== 'ready') return false;
    if (filter === 'busy' && st !== 'indexing') return false;
    if (filter === 'attention' && !['partial', 'pending', 'error'].includes(st)) return false;
    const q = query.trim().toLowerCase();
    return !q || `${e.eventName} ${e.orgName} ${e.eventLocation || ''}`.toLowerCase().includes(q);
  });

  const handleSync = async (e) => {
    try { await sync(e.eventId); toast(`Syncing "${e.eventName}" from Drive`, 'info'); } catch (err) { toast(err.message, 'error'); }
  };

  const handleDelete = async (e) => {
    const ok = await confirm({
      title: `Delete "${e.eventName}"?`,
      body: 'The gallery link stops working and its face index is erased. Photos in Google Drive are not touched.',
      confirmLabel: 'Delete event', danger: true,
    });
    if (!ok) return;
    try { await remove(e.eventId); toast('Event deleted'); } catch (err) { toast(err.message, 'error'); }
  };

  const firstName = (user?.name || '').split(' ')[0];
  const indexingCount = events.filter((e) => { const st = statusOf(e); return st.state === 'indexing' || st.driving; }).length;
  const STATS = [
    { label: 'Events', value: events.length },
    { label: 'Photos synced', value: totals.photos },
    { label: 'Faces indexed', value: totals.faces },
    { label: 'Guest visits · 30d', value: stats?.visits ?? 0 },
    { label: 'Selfie scans · 30d', value: stats?.faceScans ?? 0 },
  ];

  return (
    <>
      <section className="relative mb-10 rounded-[28px] border border-line bg-gradient-to-br from-card via-paper to-plum-soft/60 overflow-hidden">
        <div aria-hidden className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-coral/15 blur-3xl" />
        <div aria-hidden className="absolute right-40 -bottom-32 w-72 h-72 rounded-full bg-plum/10 blur-3xl" />
        <div className="relative grid md:grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
          <div className="p-6 sm:p-10 pb-4 md:pb-10">
            <p className="eyebrow mb-3">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <h1 className="display text-4xl sm:text-5xl leading-[1.02] mb-3">
              {greeting()} <span className="display-italic text-plum">{firstName || 'there'}.</span>
            </h1>
            <p className="text-ink-2 max-w-md mb-6">{indexingCount ? `${indexingCount} gallery${indexingCount > 1 ? ' galleries are' : ' is'} being indexed right now.` : events.length ? 'Every gallery is ready. Share the QR codes and let guests find themselves.' : 'Connect a Drive folder and your first gallery is live in minutes.'}</p>
            <div className="flex flex-wrap gap-2">
              <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={() => go('new')} className="btn-plum"><Plus className="w-4 h-4" /> New event</motion.button>
              {events.length > 0 && <button onClick={() => go('people')} className="btn-ghost"><Users className="w-4 h-4" /> People</button>}
            </div>
          </div>
          <div className="relative flex items-end justify-center md:justify-end pr-4 sm:pr-10 -mb-2">
            <div className="absolute top-2 right-[58%] md:right-[78%] w-max max-w-[220px] hidden sm:block">
              <Bubble>{totals.faces ? `${totals.faces.toLocaleString()} faces ready to be found!` : "Vanakkam! Let's make a gallery."}</Bubble>
            </div>
            <Mascot pose="welcome" className="w-32 sm:w-40 md:w-48 lg:w-52 mt-4 sm:mt-14" />
          </div>
        </div>
      </section>

      {/* Stat strip, newspaper-column style */}
      <section className="grid grid-cols-2 md:grid-cols-5 border-y border-line mb-10 -mt-2">
        {STATS.map((s, i) => (
          <div key={s.label} className={`py-5 px-4 sm:px-5 ${i ? 'md:border-l' : ''} ${i % 2 ? 'border-l' : ''} ${i >= 2 ? 'border-t md:border-t-0' : ''} border-line ${i === 4 ? 'col-span-2 md:col-span-1' : ''}`}>
            <p className="eyebrow mb-2">{s.label}</p>
            <p className="display text-3xl sm:text-4xl"><CountUp value={s.value} /></p>
          </div>
        ))}
      </section>

      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
        <h2 className="display text-2xl mr-auto">Your galleries</h2>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search events" className="field py-2 pl-10 w-full md:w-60 text-sm" />
        </div>
        <div className="flex items-center gap-2 justify-between">
          <Segmented id="filter" options={FILTERS} value={filter} onChange={setFilter} />
          <div className="flex p-1 rounded-full border border-line bg-card">
            {[['grid', LayoutGrid], ['list', List]].map(([v, Icon]) => (
              <button key={v} onClick={() => setLayout(v)} aria-label={`${v} view`} aria-pressed={layout === v}
                className={`p-1.5 rounded-full ${layout === v ? 'bg-ink text-paper' : 'text-ink-3 hover:text-ink'}`}><Icon className="w-4 h-4" /></button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <MascotState pose="sad" title="Can't reach the gallery server" className="mb-8">{error}</MascotState>
      )}

      {loading ? (
        <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => <li key={i} className="card h-80 animate-pulse bg-paper-2/60" />)}
        </ul>
      ) : events.length === 0 ? (
        <MascotState pose="handshake" title={<>Your first gallery starts <span className="display-italic text-plum">here.</span></>}
          action={<button onClick={() => go('new')} className="btn-plum"><Plus className="w-4 h-4" /> Create an event</button>}>
          Connect a Google Drive folder of event photos. We'll index every face so guests can find themselves with a selfie.
        </MascotState>
      ) : shown.length === 0 ? (
        <p className="py-16 text-center text-ink-3">No events match{query ? ` "${query}"` : ' this filter'}.</p>
      ) : (
        <ul className={layout === 'grid' ? 'grid sm:grid-cols-2 xl:grid-cols-3 gap-6' : 'border-t border-line'}>
          <AnimatePresence mode="popLayout">
            {shown.map((e, i) => (
              <EventCard key={e.eventId} event={e} status={statusOf(e)} index={i} layout={layout} go={go} serverless={mode === 'serverless'}
                onShare={() => setSharing(e)} onEdit={() => setEditing(e)} onSync={() => handleSync(e)} onDelete={() => handleDelete(e)} />
            ))}
          </AnimatePresence>
        </ul>
      )}

      <EditEventModal event={editing} onClose={() => setEditing(null)} />
      <ShareModal event={sharing} onClose={() => setSharing(null)} />
    </>
  );
}
