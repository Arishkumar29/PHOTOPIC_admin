import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Download, Images, Loader2, RefreshCw, UserRound, Users } from 'lucide-react';
import { useEvents } from '../context/EventsContext';
import { api, apiFetch, driveThumb } from '../lib/api';
import { CountUp, Modal, PageHeading, useFeedback } from '../components/ui';
import { Mascot, MascotState } from '../components/Mascot';

function Avatar({ person, size = 'w-full' }) {
  return (
    <div className={`${size} aspect-square rounded-full overflow-hidden bg-paper-2 ring-4 ring-card shadow-[0_10px_24px_-14px_rgba(29,26,23,.6)]`}>
      {person.cover ? (
        <img src={person.cover} alt="" className="w-full h-full object-cover" />
      ) : person.photos?.[0] ? (
        <img src={driveThumb(person.photos[0], 200)} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover blur-[1px]" />
      ) : (
        <span className="w-full h-full grid place-items-center text-ink-3"><UserRound className="w-1/3 h-1/3" /></span>
      )}
    </div>
  );
}

function PersonModal({ person, index, eventId, eventName, onClose }) {
  const { toast } = useFeedback();
  const [zipping, setZipping] = useState(false);
  const name = person ? `Person_${index + 1}` : '';

  const downloadZip = async () => {
    setZipping(true);
    try {
      const res = await apiFetch(`/api/events/${eventId}/zip`, {
        method: 'POST',
        body: JSON.stringify({ files: person.photos, name: `${eventName || 'event'}_${name}` }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `ZIP failed (${res.status})`);
      }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${(eventName || 'event').replace(/[^\w-]+/g, '_')}_${name}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast(`Downloaded ${person.photos.length} photos`);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setZipping(false);
    }
  };

  return (
    <Modal open={Boolean(person)} onClose={onClose} width="max-w-4xl"
      title={person ? `Person ${index + 1}` : ''}
      subtitle={person ? `${person.photos.length} photo${person.photos.length === 1 ? '' : 's'} · ${person.faces} face${person.faces === 1 ? '' : 's'} found` : ''}
      footer={person && (
        <button onClick={downloadZip} disabled={zipping} className="btn-plum">
          {zipping ? <><Loader2 className="w-4 h-4 animate-spin" /> Packing photos…</> : <><Download className="w-4 h-4" /> Download ZIP ({person.photos.length})</>}
        </button>
      )}>
      {person && (
        <>
          <div className="flex items-center gap-4 mb-6">
            <Avatar person={person} size="w-20" />
            <p className="text-sm text-ink-2 max-w-md">Every photo this person appears in. Download them as a ZIP to send to them directly.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {person.photos.map((id, i) => (
              <motion.a key={id} href={driveThumb(id, 2048)} target="_blank" rel="noreferrer"
                initial={{ opacity: 0, y: 14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: Math.min(i, 16) * 0.035, duration: 0.35 }}
                whileHover={{ y: -3 }}
                className="block aspect-[4/3] rounded-xl overflow-hidden bg-paper-2">
                <img src={driveThumb(id, 400)} alt="" loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              </motion.a>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}

export function People({ eventId, go }) {
  const { events, loading: eventsLoading, reindex } = useEvents();
  const { confirm, toast } = useFeedback();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const event = events.find((e) => e.eventId === eventId) || events[0];

  useEffect(() => { if (event && event.eventId !== eventId) go('people', event.eventId); }, [event, eventId, go]);

  useEffect(() => {
    if (!event) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    api(`/api/events/${event.eventId}/people`)
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [event?.eventId, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshFaces = async () => {
    const ok = await confirm({
      title: 'Refresh faces?',
      body: 'PhotoPic re-reads every photo in this event to save a face picture for each person. It takes a few minutes; guests can keep scanning meanwhile.',
      confirmLabel: 'Refresh faces',
    });
    if (!ok) return;
    try {
      await reindex(event.eventId);
      toast('Re-indexing started. Check back in a few minutes.', 'info');
      go('overview');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const people = data?.people || [];
  const photoTotal = new Set(people.flatMap((p) => p.photos)).size;

  if (!eventsLoading && events.length === 0) {
    return (
      <>
        <PageHeading eyebrow="People" title="Everyone at" accent="your events." />
        <MascotState pose="handshake" title="No events yet" action={<button onClick={() => go('new')} className="btn-plum">Create an event</button>}>
          Once a gallery is indexed, everyone who appears in it shows up here.
        </MascotState>
      </>
    );
  }

  return (
    <>
      <PageHeading eyebrow="People" title="Everyone at" accent={event ? `${event.eventName}.` : 'your events.'}>
        <select value={event?.eventId || ''} onChange={(e) => go('people', e.target.value)} className="field py-2 w-auto text-sm font-semibold pr-8" aria-label="Event">
          {events.map((e) => <option key={e.eventId} value={e.eventId}>{e.eventName}</option>)}
        </select>
        <button onClick={() => setReloadKey((k) => k + 1)} className="btn-ghost py-2" aria-label="Reload"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </PageHeading>

      {data && !loading && !error && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-6 text-sm text-ink-2">
          <span className="inline-flex items-center gap-2"><Users className="w-4 h-4 text-plum" /><b className="display text-2xl text-ink"><CountUp value={people.length} /></b> people found</span>
          <span className="inline-flex items-center gap-2"><Images className="w-4 h-4 text-coral" /><b className="display text-2xl text-ink"><CountUp value={photoTotal} /></b> photos</span>
          {data.unassigned > 0 && <span className="text-ink-3">{data.unassigned.toLocaleString()} faces seen only once</span>}
        </div>
      )}

      {data?.needsReindex && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-2xl border border-plum/20 bg-plum-soft/70 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 overflow-hidden">
          <Mascot pose="rocket" className="w-20 shrink-0 hidden sm:block" />
          <div className="flex-1">
            <p className="font-bold text-ink">Refresh faces to see everyone's photo</p>
            <p className="text-sm text-ink-2">This event was indexed before face pictures were saved. A quick re-index adds them.</p>
          </div>
          <button onClick={refreshFaces} className="btn-plum shrink-0"><RefreshCw className="w-4 h-4" /> Refresh faces</button>
        </motion.div>
      )}

      {error ? (
        <MascotState pose="sad" title="Couldn't load people">{error}</MascotState>
      ) : loading || !data ? (
        <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-7 gap-x-4 gap-y-8">
          {Array.from({ length: 14 }).map((_, i) => (
            <li key={i} className="flex flex-col items-center gap-3">
              <span className="w-full aspect-square rounded-full bg-paper-2 animate-pulse" />
              <span className="h-3 w-16 rounded bg-paper-2 animate-pulse" />
            </li>
          ))}
        </ul>
      ) : people.length === 0 ? (
        <MascotState pose="sad" title="Nobody here yet">
          {event && (event.indexStatus?.state === 'ready' ? 'No faces were clear enough to group in this event.' : 'Faces appear here once the event finishes indexing.')}
        </MascotState>
      ) : (
        <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-7 gap-x-4 gap-y-8">
          <AnimatePresence>
            {people.map((p, i) => (
              <motion.li key={p.id}
                initial={{ opacity: 0, y: 16, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: Math.min(i, 28) * 0.025, type: 'spring', damping: 18, stiffness: 220 }}>
                <motion.button onClick={() => setOpen(i)} whileHover={{ y: -6 }} whileTap={{ scale: 0.95 }}
                  className="group w-full flex flex-col items-center text-center" aria-label={`Person ${i + 1}, ${p.photos.length} photos`}>
                  <span className="relative w-full">
                    <Avatar person={p} />
                    <span className="absolute -bottom-1 -right-1 min-w-7 h-7 px-1.5 rounded-full bg-ink text-paper text-xs font-bold grid place-items-center ring-2 ring-card transition-colors group-hover:bg-plum">
                      {p.photos.length}
                    </span>
                  </span>
                  <span className="mt-3 text-sm font-bold">Person {i + 1}</span>
                  <span className="text-[11px] text-ink-3">{p.photos.length} photo{p.photos.length === 1 ? '' : 's'}</span>
                </motion.button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <PersonModal person={open !== null ? people[open] : null} index={open ?? 0} eventId={event?.eventId} eventName={event?.eventName} onClose={() => setOpen(null)} />
    </>
  );
}
