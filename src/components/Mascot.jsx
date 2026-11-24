import { AnimatePresence, motion } from 'motion/react';

// The GWC kid. Transparent WebPs in /public; always decorative.
export const MASCOTS = {
  welcome: '/welcome_mascot.webp',
  rocket: '/mascot_rocket.webp',
  sad: '/mascot_sad.webp',
  handshake: '/mascot_handshake.webp',
};

const FLOAT = { y: [0, -8, 0], transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' } };

/** A mascot pose with a spring entrance and an idle float. Changing `pose` cross-fades. */
export function Mascot({ pose = 'welcome', className = '', float = true, delay = 0, style }) {
  return (
    <motion.div className={`relative pointer-events-none select-none ${className}`} style={style} animate={float ? FLOAT : undefined} aria-hidden>
      <AnimatePresence mode="popLayout" initial>
        <motion.img
          key={pose}
          src={MASCOTS[pose]}
          alt=""
          draggable={false}
          initial={{ opacity: 0, y: 24, scale: 0.9, rotate: -4 }}
          animate={{ opacity: 1, y: 0, scale: 1, rotate: 0, transition: { type: 'spring', damping: 14, stiffness: 160, delay } }}
          exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.15 } }}
          className="w-full h-auto drop-shadow-[0_18px_24px_rgba(110,43,139,0.18)]"
        />
      </AnimatePresence>
    </motion.div>
  );
}

/** Speech bubble that pops in next to a mascot. */
export function Bubble({ children, className = '', tail = 'left' }) {
  return (
    <motion.div
      key={typeof children === 'string' ? children : undefined}
      initial={{ opacity: 0, scale: 0.6, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', damping: 15, stiffness: 260, delay: 0.25 }}
      className={`relative bg-card border border-line rounded-2xl px-4 py-2.5 text-sm font-semibold text-ink shadow-[0_10px_30px_-15px_rgba(29,26,23,.4)] origin-bottom-left ${className}`}
    >
      {children}
      <span className={`absolute -bottom-[7px] ${tail === 'left' ? 'left-6' : 'right-6'} w-3.5 h-3.5 bg-card border-r border-b border-line rotate-45`} />
    </motion.div>
  );
}

/** Small confetti burst; render with a changing key to replay. */
export function Confetti({ count = 26 }) {
  const colors = ['#6e2b8b', '#da7756', '#e6b94f', '#4f7a55', '#b07ad0'];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
        const dist = 90 + Math.random() * 110;
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 w-2 h-3 rounded-[2px]"
            style={{ background: colors[i % colors.length] }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
            animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist + 60, opacity: 0, rotate: 360 + Math.random() * 360, scale: 1 }}
            transition={{ duration: 1.4 + Math.random() * 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
        );
      })}
    </div>
  );
}

/** Empty / error state with a mascot. */
export function MascotState({ pose = 'sad', title, children, action, className = '' }) {
  return (
    <div className={`card p-8 sm:p-12 flex flex-col sm:flex-row items-center gap-6 sm:gap-10 text-center sm:text-left ${className}`}>
      <Mascot pose={pose} className="w-36 sm:w-44 shrink-0" />
      <div>
        <h3 className="display text-2xl sm:text-3xl mb-2">{title}</h3>
        {children && <div className="text-ink-2 max-w-md mb-5 leading-relaxed">{children}</div>}
        {action}
      </div>
    </div>
  );
}
