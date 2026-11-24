import { useEffect, useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { Check, Copy, Download, ExternalLink, ImagePlus, Link as LinkIcon, Loader2 } from 'lucide-react';
import { Modal, useFeedback } from './ui';
import { useEvents } from '../context/EventsContext';
import { guestLink, GUEST_URL } from '../lib/api';

export const EVENT_TYPES = ['Wedding', 'Corporate', 'Concert', 'Campus', 'Sports', 'Other'];

export const PRESET_COVERS = [
  { id: 'celebration', name: 'Celebration', url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=900&auto=format&fit=crop&q=80' },
  { id: 'corporate', name: 'Corporate', url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=900&auto=format&fit=crop&q=80' },
  { id: 'festival', name: 'Festival', url: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=900&auto=format&fit=crop&q=80' },
  { id: 'campus', name: 'Campus', url: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=900&auto=format&fit=crop&q=80' },
];

// Covers are stored in the event document: keep uploads small.
function shrinkImage(file, maxSide = 1400) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not an image we can read.'));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function CoverPicker({ value, onChange, extra = [] }) {
  const fileRef = useRef(null);
  const { toast } = useFeedback();
  const [dragging, setDragging] = useState(false);
  const options = [...extra.map((url, i) => ({ id: `x${i}`, name: 'From event', url })), ...PRESET_COVERS];

  const take = async (file) => {
    if (!file) return;
    try { onChange(await shrinkImage(file)); } catch (err) { toast(err.message, 'error'); }
  };

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
        {options.map((c) => (
          <button key={c.id} type="button" onClick={() => onChange(c.url)} title={c.name}
            className={`relative aspect-[4/3] rounded-xl overflow-hidden ring-offset-2 ring-offset-card transition-all ${value === c.url ? 'ring-2 ring-ink scale-[1.03]' : 'opacity-80 hover:opacity-100'}`}>
            <img src={c.url} alt={c.name} className="w-full h-full object-cover" />
            {value === c.url && <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-ink text-paper grid place-items-center"><Check className="w-3 h-3" /></span>}
            <span className="absolute bottom-0 inset-x-0 text-[10px] font-bold text-white text-left px-2 py-1 bg-gradient-to-t from-black/60 to-transparent">{c.name}</span>
          </button>
        ))}
        <button type="button" onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); take(e.dataTransfer.files?.[0]); }}
          className={`aspect-[4/3] rounded-xl border-2 border-dashed grid place-items-center text-center text-[11px] font-bold transition-colors ${dragging ? 'border-plum bg-plum-soft text-plum' : 'border-line text-ink-3 hover:border-ink-3 hover:text-ink'}`}>
          <span className="flex flex-col items-center gap-1"><ImagePlus className="w-4 h-4" /> Upload / drop</span>
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { take(e.target.files?.[0]); e.target.value = ''; }} />
    </div>
  );
}

export function EditEventModal({ event, onClose }) {
  const { update } = useEvents();
  const { toast } = useFeedback();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (event) {
      setForm({
        eventName: event.eventName || '', orgName: event.orgName || '', eventType: event.eventType || 'Other',
        eventLocation: event.eventLocation || '', eventDate: event.eventDate || '', description: event.description || '',
        coverImage: event.coverImage || PRESET_COVERS[0].url,
        folderId: event.folderId ? `https://drive.google.com/drive/folders/${event.folderId}` : '',
      });
    }
  }, [event]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const save = async (e) => {
    e.preventDefault();
    if (!form.eventName.trim()) return toast('Give the event a name.', 'error');
    setSaving(true);
    try {
      await update(event.eventId, { ...form, eventName: form.eventName.trim(), folderId: form.folderId.trim() || undefined });
      toast('Event updated');
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const eventThumbs = (event?.photos || []).slice(0, 1);

  return (
    <Modal open={Boolean(event)} onClose={onClose} title="Edit event" subtitle={event?.eventName} width="max-w-2xl"
      footer={<>
        <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" form="edit-event" className="btn-ink" disabled={saving}>
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save changes'}
        </button>
      </>}>
      {form && (
        <form id="edit-event" onSubmit={save} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="field-label">Event name</label><input className="field" value={form.eventName} onChange={set('eventName')} required /></div>
            <div><label className="field-label">Organizer / studio</label><input className="field" value={form.orgName} onChange={set('orgName')} /></div>
            <div><label className="field-label">Date</label><input type="date" className="field" value={form.eventDate} onChange={set('eventDate')} /></div>
            <div><label className="field-label">Location</label><input className="field" value={form.eventLocation} onChange={set('eventLocation')} placeholder="City, venue" /></div>
          </div>
          <div>
            <label className="field-label">Type</label>
            <div className="flex flex-wrap gap-1.5">
              {EVENT_TYPES.map((t) => (
                <button type="button" key={t} onClick={() => set('eventType')(t)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${form.eventType === t ? 'bg-ink text-paper border-ink' : 'border-line text-ink-2 hover:border-ink-3'}`}>{t}</button>
              ))}
            </div>
          </div>
          <div><label className="field-label">Description</label><textarea rows={2} className="field resize-none" value={form.description} onChange={set('description')} /></div>
          <div>
            <label className="field-label">Google Drive folder</label>
            <div className="relative">
              <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
              <input className="field pl-11 font-mono text-[13px]" value={form.folderId} onChange={set('folderId')} placeholder="https://drive.google.com/drive/folders/…" />
            </div>
            <p className="text-xs text-ink-3 mt-1.5">Paste a different folder to replace this event's photos. They are re-indexed automatically.</p>
          </div>
          <div><label className="field-label">Cover</label><CoverPicker value={form.coverImage} onChange={set('coverImage')} extra={eventThumbs} /></div>
        </form>
      )}
    </Modal>
  );
}

export function ShareModal({ event, onClose }) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef(null);
  const link = event ? guestLink(event.eventId) : '';

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); } catch { /* insecure context: the field is selectable */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  // Render the SVG QR onto a canvas with a white margin, so it prints cleanly.
  const downloadQr = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      const size = 1024, pad = 96;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size + pad * 2;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, pad, pad, size, size);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `${(event.eventName || 'event').replace(/[^\w-]+/g, '_')}_QR.png`;
      a.click();
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(data)}`;
  };

  return (
    <Modal open={Boolean(event)} onClose={onClose} title="Share with guests" subtitle={event?.eventName} width="max-w-md">
      {event && (
        <div className="space-y-6">
          <div ref={qrRef} className="mx-auto w-fit p-5 bg-white rounded-2xl border border-line shadow-sm">
            <QRCode value={link} size={196} fgColor="#1d1a17" />
          </div>
          <p className="text-center text-sm text-ink-2">Print it on table cards or show it on screen. Guests scan it, take a selfie, and see their photos.</p>
          {!GUEST_URL && <p className="text-xs text-amber bg-amber-soft rounded-lg px-3 py-2">Set <code>VITE_GUEST_URL</code> in the admin build so this link points at the guest app.</p>}
          <div className="flex gap-2">
            <input readOnly value={link} onFocus={(e) => e.target.select()} className="field text-[13px] font-mono py-2.5" />
            <button onClick={copy} className="btn-ink shrink-0 px-4" aria-label="Copy link">{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={downloadQr} className="btn-ghost"><Download className="w-4 h-4" /> QR as PNG</button>
            <a href={link} target="_blank" rel="noreferrer" className="btn-ghost"><ExternalLink className="w-4 h-4" /> Open page</a>
          </div>
        </div>
      )}
    </Modal>
  );
}
