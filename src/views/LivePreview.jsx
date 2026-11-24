import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ExternalLink, Laptop, RotateCcw, Smartphone, Upload } from 'lucide-react';
import { useEvents } from '../context/EventsContext';
import { GUEST_URL, guestLink } from '../lib/api';
import { PageHeading, Segmented, StatusPill } from '../components/ui';
import { Mascot, MascotState } from '../components/Mascot';

const DEVICES = [
  { value: 'phone', label: <span className="inline-flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5" /> Phone</span> },
  { value: 'desktop', label: <span className="inline-flex items-center gap-1.5"><Laptop className="w-3.5 h-3.5" /> Desktop</span> },
];

export function LivePreview({ eventId, go }) {
  const { events, loading, statusOf } = useEvents();
  const [device, setDevice] = useState('phone');
  const [reload, setReload] = useState(0);
  const event = events.find((e) => e.eventId === eventId) || events[0];

  // Keep the URL pointing at the event being previewed.
  useEffect(() => { if (event && event.eventId !== eventId) go('preview', event.eventId); }, [event, eventId, go]);

  if (!loading && events.length === 0) {
    return (
      <>
        <PageHeading eyebrow="Live preview" title="See it as" accent="a guest." />
        <MascotState pose="handshake" title="Nothing to preview yet" action={<button onClick={() => go('new')} className="btn-plum">Create an event</button>}>
          Create an event first, then test the selfie flow here.
        </MascotState>
      </>
    );
  }

  const src = event ? `${guestLink(event.eventId)}&preview=${reload}` : '';

  return (
    <>
      <PageHeading eyebrow="Live preview" title="See it as" accent="a guest.">
        <Segmented id="device" options={DEVICES} value={device} onChange={setDevice} />
        <button onClick={() => setReload((r) => r + 1)} className="btn-ghost py-2" title="Reload the guest page"><RotateCcw className="w-4 h-4" /> Reload</button>
        {event && <a href={guestLink(event.eventId)} target="_blank" rel="noreferrer" className="btn-ghost py-2"><ExternalLink className="w-4 h-4" /> New tab</a>}
      </PageHeading>

      <div className="grid xl:grid-cols-[280px_minmax(0,1fr)] gap-8 items-start">
        <aside className="space-y-5">
          <div>
            <p className="eyebrow mb-3">Event</p>
            <ul className="space-y-1.5 max-h-[45vh] overflow-y-auto scrollbar-none">
              {events.map((e) => {
                const active = e.eventId === event?.eventId;
                return (
                  <li key={e.eventId}>
                    <button onClick={() => go('preview', e.eventId)}
                      className={`w-full text-left px-3.5 py-3 rounded-xl border transition-colors ${active ? 'bg-card border-ink shadow-sm' : 'border-transparent hover:bg-card hover:border-line'}`}>
                      <p className="font-bold truncate">{e.eventName}</p>
                      <div className="mt-1.5"><StatusPill status={statusOf(e)} /></div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="card p-4 pt-3 text-sm text-ink-2 leading-relaxed relative overflow-hidden">
            <Mascot pose="rocket" className="w-24 -mb-1 -ml-1" />
            <p className="font-bold text-ink flex items-center gap-2 mb-1.5"><Upload className="w-4 h-4 text-coral" /> Testing tip</p>
            Use <b>Upload a photo</b> on the guest page to test with any picture of an attendee, no camera needed.
          </div>
          {!GUEST_URL && <p className="text-xs text-amber bg-amber-soft rounded-lg px-3 py-2">Set <code>VITE_GUEST_URL</code> in the admin build to the deployed guest app.</p>}
        </aside>

        <div className="flex justify-center">
          <AnimatePresence mode="wait">
            <motion.div key={device} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.3 }}
              className={device === 'phone'
                ? 'w-[390px] max-w-full h-[780px] max-h-[80vh] rounded-[46px] bg-ink p-3 shadow-[0_40px_80px_-40px_rgba(29,26,23,.7)]'
                : 'w-full rounded-2xl bg-ink pt-8 px-1.5 pb-1.5 shadow-[0_40px_80px_-40px_rgba(29,26,23,.7)] relative'}>
              {device === 'desktop' && (
                <div className="absolute top-2.5 left-4 flex gap-1.5">{['#e5776a', '#e6b94f', '#7cbf6e'].map((c) => <span key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />)}</div>
              )}
              {src && (
                <iframe key={src} src={src} title="Guest page preview" allow="camera; clipboard-write"
                  className={`w-full bg-paper ${device === 'phone' ? 'h-full rounded-[36px]' : 'h-[72vh] rounded-xl'}`} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
