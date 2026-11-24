import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import QRCode from 'react-qr-code';
import { ArrowLeft, ArrowRight, Calendar, Check, CheckCircle2, Copy, FolderOpen, Link as LinkIcon, Loader2, MapPin, MonitorSmartphone, Share2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEvents } from '../context/EventsContext';
import { guestLink } from '../lib/api';
import { Tilt, useFeedback } from '../components/ui';
import { CoverPicker, EVENT_TYPES, PRESET_COVERS } from '../components/EventModals';
import { Bubble, Confetti, Mascot } from '../components/Mascot';

const STEPS = ['The event', 'Photos', 'Publish'];
const DRIVE_FOLDER = /drive\.google\.com\/.*folders\/[\w-]{10,}|^[\w-]{20,}$/;

function Stepper({ step }) {
  return (
    <ol className="flex items-center gap-2 sm:gap-4 mb-10">
      {STEPS.map((label, i) => {
        const n = i + 1, done = step > n, active = step === n;
        return (
          <li key={label} className="flex items-center gap-2 sm:gap-4 flex-1 last:flex-none">
            <span className="flex items-center gap-2.5 shrink-0">
              <span className={`w-8 h-8 rounded-full grid place-items-center text-sm font-display transition-colors ${done ? 'bg-sage text-white' : active ? 'bg-ink text-paper' : 'border border-line text-ink-3'}`}>
                {done ? <Check className="w-4 h-4" /> : n}
              </span>
              <span className={`text-sm font-bold hidden sm:block ${active ? 'text-ink' : 'text-ink-3'}`}>{label}</span>
            </span>
            {n < STEPS.length && (
              <span className="h-px flex-1 bg-line relative overflow-hidden">
                <motion.span className="absolute inset-0 bg-ink origin-left" initial={false} animate={{ scaleX: done ? 1 : 0 }} transition={{ duration: 0.5 }} />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function PreviewCard({ form, orgName }) {
  const date = form.eventDate ? new Date(form.eventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  return (
    <div className="lg:sticky lg:top-8">
      <p className="eyebrow mb-3">Guest page preview</p>
      <Tilt max={7} className="rounded-3xl">
        <div className="rounded-3xl overflow-hidden bg-card border border-line shadow-[0_30px_60px_-35px_rgba(29,26,23,.55)]">
          <div className="relative aspect-[4/3]">
            <AnimatePresence mode="popLayout">
              <motion.img key={form.coverImage} src={form.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover"
                initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} />
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
            <span className="absolute top-4 left-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white/85">{form.eventType}</span>
            <div className="absolute bottom-0 p-5 text-white">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70 mb-1">{orgName || 'Your studio'}</p>
              <h3 className="display text-3xl leading-tight break-words">{form.eventName || <span className="display-italic opacity-60">Untitled event</span>}</h3>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-3 font-medium">
              {date && <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{date}</span>}
              {form.eventLocation && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{form.eventLocation}</span>}
            </div>
            {form.description && <p className="text-sm text-ink-2 leading-relaxed line-clamp-3">{form.description}</p>}
            <div className="rounded-full bg-ink text-paper text-sm font-semibold py-3 text-center">Take a selfie to find your photos</div>
          </div>
        </div>
      </Tilt>
    </div>
  );
}

export function CreateEvent({ go }) {
  const { user } = useAuth();
  const { create } = useEvents();
  const { toast } = useFeedback();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    eventName: '', orgName: '', eventType: 'Wedding', eventLocation: '', description: '',
    eventDate: new Date().toISOString().slice(0, 10), coverImage: PRESET_COVERS[0].url, folder: '',
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e })); setErrors((x) => ({ ...x, [k]: null })); };

  const next = (e) => {
    e?.preventDefault();
    if (!form.eventName.trim()) return setErrors({ eventName: 'Give your event a name.' });
    setStep(2);
  };

  const publish = async (e) => {
    e?.preventDefault();
    if (!DRIVE_FOLDER.test(form.folder.trim())) return setErrors({ folder: 'Paste a Google Drive folder link, like drive.google.com/drive/folders/…' });
    setBusy(true);
    setErrors({});
    const eventId = `evt_${Math.random().toString(36).slice(2, 9)}`;
    try {
      const event = await create({
        eventId, folderId: form.folder.trim(), eventName: form.eventName.trim(),
        orgName: form.orgName.trim() || user?.name || 'GWC PhotoPic', eventType: form.eventType,
        eventLocation: form.eventLocation.trim() || undefined, description: form.description.trim() || undefined,
        eventDate: form.eventDate || undefined, coverImage: form.coverImage,
      });
      setCreated(event);
      setStep(3);
    } catch (err) {
      setErrors({ folder: err.message });
    } finally {
      setBusy(false);
    }
  };

  const link = created ? guestLink(created.eventId) : '';
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); } catch {}
    setCopied(true); toast('Link copied');
    setTimeout(() => setCopied(false), 1800);
  };

  const slide = { initial: { opacity: 0, x: 24 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -24 }, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } };

  return (
    <div>
      <div className="pb-6 mb-8 border-b border-line">
        <p className="eyebrow mb-3">New event</p>
        <h1 className="display text-4xl sm:text-5xl leading-[1.02]">Set up a <span className="display-italic text-plum">gallery.</span></h1>
      </div>

      <Stepper step={step} />

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.form key="s1" {...slide} onSubmit={next} className="grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-10">
            <div className="space-y-6">
              <div>
                <label className="field-label" htmlFor="ev-name">Event name</label>
                <input id="ev-name" autoFocus value={form.eventName} onChange={set('eventName')} placeholder="e.g. Annual Day 2026"
                  className={`field display text-2xl py-4 ${errors.eventName ? 'border-rust focus:border-rust focus:ring-rust/10' : ''}`} />
                {errors.eventName && <p className="text-sm text-rust font-semibold mt-2">{errors.eventName}</p>}
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className="field-label">Organizer / studio</label><input className="field" value={form.orgName} onChange={set('orgName')} placeholder={user?.name} /></div>
                <div><label className="field-label">Date</label><input type="date" className="field" value={form.eventDate} onChange={set('eventDate')} /></div>
                <div className="sm:col-span-2"><label className="field-label">Location <span className="normal-case tracking-normal font-medium">(optional)</span></label><input className="field" value={form.eventLocation} onChange={set('eventLocation')} placeholder="City, venue" /></div>
              </div>
              <div>
                <label className="field-label">Type</label>
                <div className="flex flex-wrap gap-1.5">
                  {EVENT_TYPES.map((t) => (
                    <button type="button" key={t} onClick={() => set('eventType')(t)}
                      className={`px-4 py-2 rounded-full text-sm font-bold border transition-all ${form.eventType === t ? 'bg-ink text-paper border-ink' : 'border-line text-ink-2 hover:border-ink-3 bg-card'}`}>{t}</button>
                  ))}
                </div>
              </div>
              <div><label className="field-label">Description <span className="normal-case tracking-normal font-medium">(optional)</span></label><textarea rows={3} className="field resize-none" value={form.description} onChange={set('description')} placeholder="A line or two guests will see on the gallery page." /></div>
              <div><label className="field-label">Cover</label><CoverPicker value={form.coverImage} onChange={set('coverImage')} /></div>
              <div className="flex justify-end pt-2">
                <button type="submit" className="btn-ink px-6 py-3 group">Next: connect photos <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></button>
              </div>
            </div>
            <PreviewCard form={form} orgName={form.orgName || user?.name} />
          </motion.form>
        )}

        {step === 2 && (
          <motion.form key="s2" {...slide} onSubmit={publish} className="max-w-3xl">
            <div className="flex flex-col-reverse sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <h2 className="display text-3xl mb-2">Connect a Google Drive folder</h2>
                <p className="text-ink-2 max-w-xl">Photos stay in your Drive. PhotoPic reads them, finds every face, and keeps up when you add more with <b>Sync photos</b>.</p>
              </div>
              <div className="relative shrink-0 self-center sm:self-auto">
                <Mascot pose="handshake" className="w-40 sm:w-48" />
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-max"><Bubble>Drive + PhotoPic = friends!</Bubble></div>
              </div>
            </div>
            <ol className="grid sm:grid-cols-3 gap-px bg-line border border-line rounded-2xl overflow-hidden mb-8">
              {[
                ['Open the folder', 'In drive.google.com, open the folder with the event photos. Subfolders are included.'],
                ['Share it', 'Share → General access → "Anyone with the link" as Viewer.'],
                ['Paste the link', 'Copy the folder link and paste it below. Indexing starts right away.'],
              ].map(([t, b], i) => (
                <li key={t} className="bg-card p-5">
                  <p className="display text-3xl text-coral mb-3">{String(i + 1).padStart(2, '0')}</p>
                  <p className="font-bold mb-1">{t}</p>
                  <p className="text-sm text-ink-2 leading-relaxed">{b}</p>
                </li>
              ))}
            </ol>
            <label className="field-label" htmlFor="folder">Drive folder link</label>
            <div className="relative">
              <FolderOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-3" />
              <input id="folder" autoFocus value={form.folder} onChange={set('folder')} placeholder="https://drive.google.com/drive/folders/…"
                className={`field pl-12 py-4 font-mono text-sm ${errors.folder ? 'border-rust' : DRIVE_FOLDER.test(form.folder.trim()) ? 'border-sage' : ''}`} />
              {DRIVE_FOLDER.test(form.folder.trim()) && !errors.folder && <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sage" />}
            </div>
            {errors.folder && <p className="text-sm text-rust font-semibold mt-2">{errors.folder}</p>}
            <div className="flex items-center justify-between gap-3 pt-8">
              <button type="button" onClick={() => setStep(1)} className="btn-quiet"><ArrowLeft className="w-4 h-4" /> Back</button>
              <button type="submit" disabled={busy || !form.folder.trim()} className="btn-plum px-6 py-3">
                {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Reading your folder…</> : <>Publish event <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </motion.form>
        )}

        {step === 3 && created && (
          <motion.div key="s3" {...slide} className="grid md:grid-cols-[auto_minmax(0,1fr)] gap-10 items-center max-w-4xl">
            <div className="relative mx-auto">
              <Confetti />
              <motion.img src="/mascot_rocket.webp" alt="" aria-hidden
                className="absolute -top-20 -right-16 w-36 z-10 pointer-events-none drop-shadow-lg"
                initial={{ x: -160, y: 160, opacity: 0, rotate: -10 }}
                animate={{ x: 0, y: [0, -6, 0], opacity: 1, rotate: 0 }}
                transition={{ x: { type: 'spring', damping: 14 }, opacity: { duration: 0.3 }, y: { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.8 } }} />
              <motion.div initial={{ rotate: -6, scale: 0.9 }} animate={{ rotate: -2, scale: 1 }} transition={{ type: 'spring', damping: 12 }}
                className="relative p-5 bg-white rounded-2xl border border-line shadow-[0_24px_50px_-30px_rgba(29,26,23,.6)]">
                <QRCode value={link} size={200} fgColor="#1d1a17" />
                <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-ink-3 mt-3">Scan to find your photos</p>
              </motion.div>
            </div>
            <div>
              <p className="eyebrow mb-3 text-sage">Published</p>
              <h2 className="display text-4xl sm:text-5xl leading-tight mb-3"><span className="display-italic">{created.eventName}</span> is live.</h2>
              <p className="text-ink-2 mb-6">We're indexing {created.indexStatus?.total?.toLocaleString() ?? 'the'} photos now. Guests can already scan; their results fill in as indexing finishes.</p>
              <div className="flex gap-2 mb-4">
                <input readOnly value={link} onFocus={(e) => e.target.select()} className="field font-mono text-[13px] py-2.5" />
                <button onClick={copy} className="btn-ink px-4 shrink-0" aria-label="Copy link">{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => go('preview', created.eventId)} className="btn-plum"><MonitorSmartphone className="w-4 h-4" /> Try it as a guest</button>
                <a href={link} target="_blank" rel="noreferrer" className="btn-ghost"><Share2 className="w-4 h-4" /> Open guest page</a>
                <button onClick={() => go('overview')} className="btn-quiet"><LinkIcon className="w-4 h-4" /> All galleries</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
