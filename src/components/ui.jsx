import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform, animate } from 'motion/react';
import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

/* ── Index status ──────────────────────────────────────────────────────── */

export function indexLabel(st = {}) {
  if (st.driving && st.state !== 'ready') return { tone: 'plum', text: `Indexing ${st.done ?? 0}/${st.total ?? '…'}` };
  switch (st.state) {
    case 'ready': return { tone: 'sage', text: `Ready · ${(st.faces ?? 0).toLocaleString()} faces` };
    case 'indexing': return { tone: 'plum', text: `Indexing ${st.done ?? 0}/${st.total ?? '…'}` };
    case 'partial': return { tone: 'amber', text: `${st.done}/${st.total} indexed` };
    case 'error': return { tone: 'rust', text: 'Sync failed' };
    default: return { tone: 'ink', text: 'Not indexed' };
  }
}

const TONES = {
  sage: 'bg-sage-soft text-sage',
  plum: 'bg-plum-soft text-plum',
  amber: 'bg-amber-soft text-amber',
  rust: 'bg-rust-soft text-rust',
  coral: 'bg-coral-soft text-[#a24f33]',
  ink: 'bg-paper-2 text-ink-2',
};

export function Pill({ tone = 'ink', children, pulse, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide ${TONES[tone]} ${className}`}>
      {pulse && <span className="relative flex w-1.5 h-1.5"><span className="absolute inset-0 rounded-full bg-current opacity-60 animate-ping" /><span className="relative w-1.5 h-1.5 rounded-full bg-current" /></span>}
      {children}
    </span>
  );
}

export function StatusPill({ status, className }) {
  const { tone, text } = indexLabel(status);
  return <Pill tone={tone} pulse={status?.state === 'indexing' || status?.driving} className={className}>{text}</Pill>;
}

/* ── Numbers ───────────────────────────────────────────────────────────── */

export function CountUp({ value = 0, className = '' }) {
  const ref = useRef(null);
  const prev = useRef(0);
  useEffect(() => {
    const controls = animate(prev.current, value, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => { if (ref.current) ref.current.textContent = Math.round(v).toLocaleString(); },
    });
    prev.current = value;
    return () => controls.stop();
  }, [value]);
  return <span ref={ref} className={`tabular-nums ${className}`}>0</span>;
}

/* ── Pointer-reactive tilt ─────────────────────────────────────────────── */

export function Tilt({ children, max = 6, className = '', ...rest }) {
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const rx = useSpring(useTransform(y, [0, 1], [max, -max]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(x, [0, 1], [-max, max]), { stiffness: 200, damping: 20 });
  const glareX = useTransform(x, (v) => `${v * 100}%`);
  const glareY = useTransform(y, (v) => `${v * 100}%`);
  const glare = useTransform([glareX, glareY], ([gx, gy]) => `radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,.35), transparent 55%)`);
  return (
    <motion.div
      {...rest}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left) / r.width);
        y.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => { x.set(0.5); y.set(0.5); }}
      className={`relative ${className}`}
    >
      {children}
      <motion.div aria-hidden style={{ background: glare }} className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-soft-light" />
    </motion.div>
  );
}

/* ── Modal ─────────────────────────────────────────────────────────────── */

export function Modal({ open, onClose, title, subtitle, children, width = 'max-w-lg', footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-6 bg-ink/40 backdrop-blur-[3px]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
        >
          <motion.div
            role="dialog" aria-modal="true" aria-label={title}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className={`w-full ${width} bg-card rounded-t-3xl sm:rounded-3xl shadow-[0_30px_80px_-20px_rgba(29,26,23,.45)] max-h-[92vh] flex flex-col overflow-hidden`}
          >
            <div className="flex items-start justify-between gap-4 px-6 sm:px-8 pt-6 sm:pt-7 pb-4 border-b border-line">
              <div>
                <h3 className="display text-2xl leading-tight">{title}</h3>
                {subtitle && <p className="text-sm text-ink-3 mt-1">{subtitle}</p>}
              </div>
              <button onClick={onClose} className="p-2 -m-1 rounded-full text-ink-3 hover:text-ink hover:bg-paper-2" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 sm:px-8 py-6 overflow-y-auto">{children}</div>
            {footer && <div className="px-6 sm:px-8 py-4 border-t border-line bg-paper/60 flex flex-wrap gap-2 justify-end">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* ── Toasts + confirm dialog ───────────────────────────────────────────── */

const FeedbackContext = createContext(null);

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);

  const toast = useCallback((message, tone = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const confirm = useCallback((opts) => new Promise((resolve) => setConfirmState({ ...opts, resolve })), []);
  const settle = (value) => { confirmState?.resolve(value); setConfirmState(null); };

  const icons = { success: CheckCircle2, error: AlertTriangle, info: Info };

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}
      <Modal
        open={Boolean(confirmState)}
        onClose={() => settle(false)}
        title={confirmState?.title}
        width="max-w-md"
        footer={<>
          <button className="btn-ghost" onClick={() => settle(false)}>Cancel</button>
          <button className={confirmState?.danger ? 'btn-danger' : 'btn-ink'} onClick={() => settle(true)} autoFocus>
            {confirmState?.confirmLabel || 'Confirm'}
          </button>
        </>}
      >
        <p className="text-ink-2 leading-relaxed">{confirmState?.body}</p>
      </Modal>
      {createPortal(
        <div className="fixed z-[70] bottom-4 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-6 sm:bottom-6 flex flex-col gap-2 w-[calc(100%-2rem)] sm:w-auto items-stretch sm:items-end pointer-events-none">
          <AnimatePresence>
            {toasts.map((t) => {
              const Icon = icons[t.tone] || Info;
              return (
                <motion.div
                  key={t.id} layout
                  initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 40 }}
                  className="pointer-events-auto flex items-center gap-3 bg-ink text-paper pl-4 pr-5 py-3 rounded-2xl shadow-xl text-sm font-medium sm:max-w-sm"
                >
                  <Icon className={`w-4 h-4 shrink-0 ${t.tone === 'error' ? 'text-coral' : 'text-[#b9d8b5]'}`} />
                  {t.message}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </FeedbackContext.Provider>
  );
}

export const useFeedback = () => useContext(FeedbackContext);

/* ── Segmented control with a sliding indicator ────────────────────────── */

export function Segmented({ options, value, onChange, id }) {
  return (
    <div className="inline-flex max-w-full overflow-x-auto scrollbar-none p-1 rounded-full bg-paper-2 border border-line">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`relative shrink-0 whitespace-nowrap px-3 sm:px-3.5 py-1.5 text-xs font-bold rounded-full transition-colors ${value === o.value ? 'text-paper' : 'text-ink-2 hover:text-ink'}`}
        >
          {value === o.value && (
            <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-full bg-ink" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ── Page heading ──────────────────────────────────────────────────────── */

export function PageHeading({ eyebrow, title, accent, children }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pb-6 mb-8 border-b border-line">
      <div>
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="display text-4xl sm:text-5xl leading-[1.02]">
          {title} {accent && <span className="display-italic text-plum">{accent}</span>}
        </h1>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
