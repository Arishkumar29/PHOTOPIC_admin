import { useEffect, useState } from 'react';
import { CheckCircle2, Copy, Database, LogOut, Server, ShieldCheck, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL, GUEST_URL, api } from '../lib/api';
import { PageHeading, useFeedback } from '../components/ui';

function Row({ label, children }) {
  return (
    <div className="grid sm:grid-cols-[200px_minmax(0,1fr)] gap-1 sm:gap-6 py-4 border-b border-line last:border-0">
      <p className="eyebrow pt-0.5">{label}</p>
      <div className="text-[15px] min-w-0 break-words">{children}</div>
    </div>
  );
}

export function Settings() {
  const { user, logout } = useAuth();
  const { toast } = useFeedback();
  const [health, setHealth] = useState(null);
  const [healthError, setHealthError] = useState('');

  useEffect(() => { api('/api/health').then(setHealth).catch((e) => setHealthError(e.message)); }, []);

  const copy = async (text) => { try { await navigator.clipboard.writeText(text); toast('Copied'); } catch {} };
  const apiOrigin = API_BASE_URL || `${window.location.origin} (dev proxy → localhost:3000)`;

  return (
    <>
      <PageHeading eyebrow="Settings" title="Account &" accent="system." />

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="card p-6 sm:p-8">
          <h2 className="display text-2xl mb-1 flex items-center gap-2.5"><ShieldCheck className="w-5 h-5 text-plum" /> Organizer account</h2>
          <p className="text-sm text-ink-3 mb-4">One admin login, configured on the server.</p>
          <Row label="Name">{user?.name}</Row>
          <Row label="Email">{user?.email}</Row>
          <Row label="Session">Signed in on this browser for up to 7 days.</Row>
          <Row label="Change password">
            <span className="text-ink-2 text-sm leading-relaxed">Update <code className="font-mono text-xs bg-paper-2 px-1.5 py-0.5 rounded">ADMIN_PASSWORD</code> in the backend environment and restart it. Changing <code className="font-mono text-xs bg-paper-2 px-1.5 py-0.5 rounded">ADMIN_EMAIL</code> signs out every session.</span>
          </Row>
          <button onClick={logout} className="btn-ghost mt-5 text-rust border-rust/30 hover:border-rust hover:bg-rust-soft"><LogOut className="w-4 h-4" /> Sign out</button>
        </section>

        <section className="card p-6 sm:p-8">
          <h2 className="display text-2xl mb-1 flex items-center gap-2.5"><Server className="w-5 h-5 text-plum" /> System</h2>
          <p className="text-sm text-ink-3 mb-4">Where this portal sends guests and API calls.</p>
          <Row label="Backend">
            {health ? (
              <span className="inline-flex items-center gap-2 text-sage font-semibold"><CheckCircle2 className="w-4 h-4" /> Healthy · {health.engine}</span>
            ) : healthError ? (
              <span className="inline-flex items-center gap-2 text-rust font-semibold"><XCircle className="w-4 h-4" /> {healthError}</span>
            ) : <span className="text-ink-3">Checking…</span>}
          </Row>
          <Row label="API address"><code className="font-mono text-[13px]">{apiOrigin}</code></Row>
          <Row label="Guest app">
            {GUEST_URL ? (
              <button onClick={() => copy(GUEST_URL)} className="inline-flex items-center gap-2 font-mono text-[13px] hover:text-plum">{GUEST_URL} <Copy className="w-3.5 h-3.5" /></button>
            ) : <span className="text-amber text-sm">Not set. Add <code>VITE_GUEST_URL</code> to the admin build.</span>}
          </Row>
          <Row label="Event storage">
            <span className="inline-flex items-center gap-2"><Database className="w-4 h-4 text-ink-3" />{health ? (health.database === 'mongodb' ? 'MongoDB' : 'Local file (events.json)') : '–'}</span>
          </Row>
        </section>
      </div>
    </>
  );
}
