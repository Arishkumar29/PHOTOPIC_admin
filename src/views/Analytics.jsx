import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Download, Loader2 } from 'lucide-react';
import { useEvents } from '../context/EventsContext';
import { api } from '../lib/api';
import { CountUp, PageHeading, Segmented } from '../components/ui';
import { MascotState } from '../components/Mascot';

const PERIODS = [{ value: 7, label: '7 days' }, { value: 30, label: '30 days' }, { value: 90, label: '90 days' }];
const METRICS = [
  { key: 'visits', label: 'Gallery visits', note: 'Guests who opened an event page' },
  { key: 'faceScans', label: 'Selfie scans', note: 'Selfies with a face, searched' },
  { key: 'views', label: 'Photo views', note: 'Photos opened full-screen' },
  { key: 'downloads', label: 'Downloads', note: 'Single photos saved' },
];

// Four even gridline steps of 1, 2 or 5 × 10^k.
function niceStep(max) {
  const raw = Math.max(max, 4) / 4;
  const p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw);
}

function VisitsChart({ labels, data }) {
  const ref = useRef(null);
  const [hover, setHover] = useState(null);
  const W = 800, H = 260, PL = 36, PR = 12, PT = 16, PB = 30;
  const step = niceStep(Math.max(0, ...data));
  const max = step * 4;
  const x = (i) => PL + (data.length <= 1 ? 0.5 : i / (data.length - 1)) * (W - PL - PR);
  const y = (v) => PT + (1 - v / max) * (H - PT - PB);
  const line = data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = data.length ? `${line} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z` : '';
  const ticks = [0, 1, 2, 3, 4].map((t) => t * step);
  const every = Math.ceil(labels.length / 8);

  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - PL) / (W - PL - PR)) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  };

  return (
    <div className="relative">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto touch-none select-none" onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label="Gallery visits per day">
        <defs>
          <linearGradient id="vis-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#6e2b8b" stopOpacity=".18" />
            <stop offset="1" stopColor="#6e2b8b" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PL} x2={W - PR} y1={y(t)} y2={y(t)} stroke="#e4dccd" strokeDasharray={t ? '3 4' : ''} />
            <text x={PL - 8} y={y(t) + 4} textAnchor="end" className="fill-ink-3 text-[11px] font-semibold">{t}</text>
          </g>
        ))}
        {labels.map((l, i) => ((i % every === 0 && labels.length - 1 - i >= every / 2) || i === labels.length - 1) && (
          <text key={l} x={x(i)} y={H - 8} textAnchor="middle" className="fill-ink-3 text-[11px] font-semibold">{l}</text>
        ))}
        <motion.path d={area} fill="url(#vis-fill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }} />
        <motion.path key={line} d={line} fill="none" stroke="#6e2b8b" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }} />
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PT} y2={H - PB} stroke="#1d1a17" strokeOpacity=".25" />
            <circle cx={x(hover)} cy={y(data[hover])} r="5.5" fill="#da7756" stroke="#fffdf9" strokeWidth="2.5" />
          </g>
        )}
      </svg>
      {hover !== null && (
        <div className="absolute top-0 pointer-events-none -translate-x-1/2 px-3 py-2 rounded-xl bg-ink text-paper text-xs shadow-lg whitespace-nowrap"
          style={{ left: `${(x(hover) / W) * 100}%` }}>
          <b className="text-sm font-display">{data[hover]}</b> visit{data[hover] === 1 ? '' : 's'} · {labels[hover]}
        </div>
      )}
    </div>
  );
}

function toCsv(rows) {
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
}

export function Analytics({ eventId, go }) {
  const { events } = useEvents();
  const [period, setPeriod] = useState(30);
  const [data, setData] = useState(null);
  const [perEvent, setPerEvent] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const selected = events.find((e) => e.eventId === eventId);

  useEffect(() => {
    setLoading(true);
    const q = `/api/analytics?period=${period}${eventId ? `&eventId=${encodeURIComponent(eventId)}` : ''}`;
    api(q).then((d) => { setData(d); setError(''); }).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, [period, eventId]);

  // Per-event breakdown for the leaderboard (only on the all-events view).
  useEffect(() => {
    if (eventId || !events.length) return;
    let cancelled = false;
    Promise.all(events.map((e) => api(`/api/analytics?period=${period}&eventId=${encodeURIComponent(e.eventId)}`).then((d) => [e.eventId, d]).catch(() => [e.eventId, null])))
      .then((pairs) => !cancelled && setPerEvent(Object.fromEntries(pairs)));
    return () => { cancelled = true; };
  }, [events, period, eventId]);

  const board = useMemo(() => events
    .map((e) => ({ e, d: perEvent[e.eventId] }))
    .filter((r) => r.d)
    .sort((a, b) => b.d.visits - a.d.visits), [events, perEvent]);
  const boardMax = Math.max(1, ...board.map((r) => r.d.visits));

  const exportCsv = () => {
    if (!data) return;
    const rows = [['Date', 'Gallery visits'], ...data.timeline.labels.map((l, i) => [l, data.timeline.data[i]]), [],
      ['Metric', `Last ${period} days`], ...METRICS.map((m) => [m.label, data[m.key]])];
    const blob = new Blob([toCsv(rows)], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `photopic_${selected ? selected.eventName.replace(/[^\w-]+/g, '_') : 'all_events'}_${period}d.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const rate = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '–');

  return (
    <>
      <PageHeading eyebrow="Analytics" title={selected ? selected.eventName : 'How guests use'} accent={selected ? '' : 'your galleries.'}>
        <select value={eventId || ''} onChange={(e) => go('analytics', e.target.value)} className="field py-2 w-auto text-sm font-semibold pr-8" aria-label="Event">
          <option value="">All events</option>
          {events.map((e) => <option key={e.eventId} value={e.eventId}>{e.eventName}</option>)}
        </select>
        <Segmented id="period" options={PERIODS} value={period} onChange={setPeriod} />
        <button onClick={exportCsv} disabled={!data} className="btn-ghost py-2"><Download className="w-4 h-4" /> CSV</button>
      </PageHeading>

      {error && <MascotState pose="sad" title="Couldn't load analytics" className="mb-8">{error}</MascotState>}

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {METRICS.map((m, i) => (
          <motion.div key={m.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="card p-5">
            <p className="eyebrow mb-3">{m.label}</p>
            <p className="display text-4xl mb-1">{data ? <CountUp value={data[m.key]} /> : '–'}</p>
            <p className="text-xs text-ink-3">{m.note}</p>
          </motion.div>
        ))}
      </section>

      <section className="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-6 mb-10">
        <div className="card p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="display text-xl">Visits per day</h2>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-ink-3" />}
          </div>
          {data && <VisitsChart labels={data.timeline.labels} data={data.timeline.data} />}
        </div>
        <div className="card p-5 sm:p-6 flex flex-col gap-6">
          <h2 className="display text-xl">Conversion</h2>
          {[
            ['Visitors who scanned', data && rate(data.faceScans, data.visits)],
            ['Views that became downloads', data && rate(data.downloads, data.views)],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="display text-4xl text-plum">{value ?? '–'}</p>
              <p className="text-sm text-ink-2 mt-1">{label}</p>
            </div>
          ))}
          <p className="text-xs text-ink-3 mt-auto leading-relaxed">Counts are anonymous: PhotoPic stores daily totals per event, not who visited.</p>
        </div>
      </section>

      {!eventId && board.length > 0 && (
        <section>
          <h2 className="display text-2xl mb-4">By event</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-line">
                  {['Event', 'Visits', 'Scans', 'Views', 'Downloads'].map((h, i) => (
                    <th key={h} className={`eyebrow font-bold px-5 py-3 ${i ? 'text-right hidden sm:table-cell' : ''} ${i === 1 ? '!table-cell' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {board.map(({ e, d }) => (
                  <tr key={e.eventId} onClick={() => go('analytics', e.eventId)} className="border-b border-line last:border-0 hover:bg-paper/70 cursor-pointer">
                    <td className="px-5 py-3.5">
                      <p className="font-bold">{e.eventName}</p>
                      <div className="h-1 mt-2 rounded-full bg-paper-2 max-w-xs overflow-hidden">
                        <motion.div className="h-full bg-coral" initial={{ width: 0 }} animate={{ width: `${(d.visits / boardMax) * 100}%` }} transition={{ duration: 0.8 }} />
                      </div>
                    </td>
                    <td className="px-5 text-right font-display text-lg tabular-nums">{d.visits.toLocaleString()}</td>
                    <td className="px-5 text-right tabular-nums hidden sm:table-cell">{d.faceScans.toLocaleString()}</td>
                    <td className="px-5 text-right tabular-nums hidden sm:table-cell">{d.views.toLocaleString()}</td>
                    <td className="px-5 text-right tabular-nums hidden sm:table-cell">{d.downloads.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
