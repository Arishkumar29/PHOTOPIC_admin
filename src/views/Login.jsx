import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimationControls, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, ShieldAlert, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Bubble, Mascot } from '../components/Mascot';

const EMAIL_KEY = 'photopic_admin_last_email';

// Stock photography only: the login page is public, so no guest photos here.
const STOCK = [
  'photo-1519741497674-611481863552', 'photo-1511795409834-ef04bbd61622', 'photo-1492684223066-81342ee5ff30',
  'photo-1505236858219-8359eb29e329', 'photo-1464366400600-7168b8af9bc3', 'photo-1530103862676-de8c9debad1d',
  'photo-1523580494863-6f3031224c94', 'photo-1540575467063-178a50c2df87', 'photo-1506157786151-b8491531f063',
  'photo-1528605248644-14dd04022da1', 'photo-1517457373958-b7bdd4587205', 'photo-1469371670807-013ccf25f16a',
].map((id) => `https://images.unsplash.com/${id}?w=420&auto=format&fit=crop&q=70`);

function Mosaic() {
  const ref = useRef(null);
  const mx = useMotionValue(-200);
  const my = useMotionValue(-200);
  const sx = useSpring(mx, { stiffness: 260, damping: 26 });
  const sy = useSpring(my, { stiffness: 260, damping: 26 });
  const cols = [STOCK.slice(0, 4), STOCK.slice(4, 8), STOCK.slice(8, 12)];

  return (
    <div
      ref={ref}
      className="relative h-full overflow-hidden bg-paper-2"
      onPointerMove={(e) => {
        const r = ref.current.getBoundingClientRect();
        mx.set(e.clientX - r.left - 70);
        my.set(e.clientY - r.top - 85);
      }}
      onPointerLeave={() => { mx.set(-200); my.set(-200); }}
    >
      <div className="absolute inset-0 grid grid-cols-3 gap-3 p-3 -rotate-6 scale-125 origin-center">
        {cols.map((col, c) => (
          <div key={c} className="relative overflow-hidden">
            <div
              className="flex flex-col gap-3"
              style={{ animation: `marquee-y ${48 + c * 10}s linear infinite ${c % 2 ? 'reverse' : ''}` }}
            >
              {[...col, ...col].map((src, i) => (
                <div key={i} className="aspect-[4/5] rounded-xl overflow-hidden bg-line shadow-sm">
                  <img src={src} alt="" loading="lazy" className="w-full h-full object-cover grayscale-[85%] contrast-[1.05] hover:grayscale-0 transition duration-700" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-paper via-paper/10 to-paper/40 pointer-events-none" />

      {/* Face-finder reticle that follows the pointer */}
      <motion.div style={{ x: sx, y: sy }} className="absolute top-0 left-0 w-[140px] h-[170px] pointer-events-none hidden lg:block">
        {['top-0 left-0 border-t-2 border-l-2', 'top-0 right-0 border-t-2 border-r-2', 'bottom-0 left-0 border-b-2 border-l-2', 'bottom-0 right-0 border-b-2 border-r-2'].map((c) => (
          <span key={c} className={`absolute w-6 h-6 border-coral rounded-[3px] ${c}`} />
        ))}
        <span className="absolute -bottom-7 left-0 text-[10px] font-bold tracking-[0.2em] uppercase text-ink bg-card/90 px-2 py-0.5 rounded">match 0.94</span>
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 p-10 xl:p-14">
        <p className="eyebrow mb-3 text-ink-2">Organizer desk</p>
        <p className="display text-3xl xl:text-4xl leading-tight max-w-md">
          Publish a gallery. Guests take a selfie. <span className="display-italic text-plum">Everyone finds their photos.</span>
        </p>
      </div>
      <style>{`@keyframes marquee-y { from { transform: translateY(0) } to { transform: translateY(-50%) } }
        @media (prefers-reduced-motion: reduce) { [style*="marquee-y"] { animation: none !important } }`}</style>
    </div>
  );
}

export function Login() {
  const { login, expired } = useAuth();
  const [email, setEmail] = useState(() => { try { return localStorage.getItem(EMAIL_KEY) || ''; } catch { return ''; } });
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const shake = useAnimationControls();
  const doShake = () => shake.start({ x: [0, -9, 8, -6, 5, -2, 0], transition: { duration: 0.45 } });
  const [configured, setConfigured] = useState(true);
  const [mood, setMood] = useState('hello'); // hello | sad | launch
  const reduce = useReducedMotion();
  const passwordRef = useRef(null);

  useEffect(() => {
    api('/api/auth/status').then((d) => setConfigured(d.configured)).catch(() => {});
    if (email) passwordRef.current?.focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Enter your email and password.'); doShake(); return; }
    setLoading(true);
    setError('');
    try {
      await login(email.trim(), password, async () => {
        setMood('launch');
        if (!reduce) await new Promise((r) => setTimeout(r, 650));
      });
      try { localStorage.setItem(EMAIL_KEY, email.trim()); } catch {}
    } catch (err) {
      setError(err.message);
      setMood('sad');
      doShake();
      setPassword('');
      passwordRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const capsCheck = (e) => setCaps(e.getModifierState?.('CapsLock'));
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] bg-paper paper-grain">
      <div className="flex flex-col min-h-screen px-6 sm:px-12 xl:px-20">
        <header className="flex items-center justify-between py-6 border-b border-line">
          <img src="/logo.png" alt="GWC DATA.AI" className="h-9 w-auto" />
          <span className="eyebrow hidden sm:block">{today}</span>
        </header>

        <main className="flex-1 flex items-center py-12">
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md"
          >
            <div className="flex items-end gap-3 mb-6 -ml-2 h-40 sm:h-48">
              <div className="relative w-32 sm:w-36 h-full shrink-0">
                <AnimatePresence>
                  {mood === 'launch' ? (
                    <motion.img key="rocket" src="/mascot_rocket.webp" alt="" aria-hidden
                      className="absolute bottom-0 left-0 w-40 max-w-none pointer-events-none"
                      initial={{ x: 0, y: 0, rotate: -8, opacity: 1 }}
                      animate={{ x: 520, y: -420, rotate: -20, opacity: [1, 1, 0] }}
                      transition={{ duration: 0.7, ease: [0.5, 0, 0.75, 0] }} />
                  ) : (
                    <motion.div key={mood} className="absolute inset-0"
                      animate={mood === 'sad' ? { rotate: [0, -6, 6, -4, 0] } : {}} transition={{ duration: 0.6 }}>
                      <Mascot pose={mood === 'sad' ? 'sad' : 'welcome'} className="h-full [&_img]:h-full [&_img]:w-auto" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="pb-10">
                <AnimatePresence mode="wait">
                  <Bubble key={mood}>
                    {mood === 'sad' ? "Hmm, that didn't match. Try again?" : mood === 'launch' ? "Let's go! 🚀" : 'Vanakkam! Ready to share some memories?'}
                  </Bubble>
                </AnimatePresence>
              </div>
            </div>
            <p className="eyebrow mb-4 flex items-center gap-2"><KeyRound className="w-3.5 h-3.5 text-coral" /> PhotoPic · Admin portal</p>
            <h1 className="display text-5xl sm:text-6xl leading-[0.98] mb-4">
              Welcome <span className="display-italic text-plum">back.</span>
            </h1>
            <p className="text-ink-2 leading-relaxed mb-10">Sign in to manage event galleries, Drive sync and guest analytics.</p>

            {expired && (
              <div className="mb-6 px-4 py-3 rounded-xl bg-amber-soft text-amber text-sm font-semibold">Your session ended. Please sign in again.</div>
            )}
            {!configured && (
              <div className="mb-6 px-4 py-3 rounded-xl bg-rust-soft text-rust text-sm leading-relaxed flex gap-2.5">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span><b>Login isn't set up on the server.</b> Add <code className="font-mono text-xs">ADMIN_EMAIL</code> and <code className="font-mono text-xs">ADMIN_PASSWORD</code> to the backend environment and restart it.</span>
              </div>
            )}

            <motion.form animate={shake} onSubmit={submit} className="space-y-5" noValidate>
              <div>
                <label htmlFor="email" className="field-label">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
                  <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="field pl-11" placeholder="you@company.com" autoFocus={!email} />
                </div>
              </div>
              <div>
                <label htmlFor="password" className="field-label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
                  <input id="password" ref={passwordRef} type={show ? 'text' : 'password'} autoComplete="current-password"
                    value={password} onChange={(e) => { setPassword(e.target.value); if (mood === 'sad') setMood('hello'); }} onKeyUp={capsCheck} onKeyDown={capsCheck}
                    className="field pl-11 pr-12" placeholder="••••••••" />
                  <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-ink-3 hover:text-ink hover:bg-paper-2">
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {caps && <p className="text-xs font-semibold text-amber mt-2">Caps Lock is on</p>}
              </div>

              {error && <p role="alert" className="text-sm font-semibold text-rust">{error}</p>}

              <button type="submit" disabled={loading} className="btn-ink w-full py-3.5 text-[15px] group">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : <>Sign in <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></>}
              </button>
            </motion.form>

            <p className="mt-10 pt-6 border-t border-line text-xs text-ink-3 leading-relaxed">
              Guests never need an account. They open the event link or QR code and take a selfie.
            </p>
          </motion.div>
        </main>
      </div>

      <div className="hidden lg:block sticky top-0 h-screen border-l border-line">
        <Mosaic />
      </div>
    </div>
  );
}
