import { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, FileText, FileBarChart, TrendingDown, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { fetchAllRecords } from '../services/milkService';
import { listCows } from '../services/cowService';
import {
  PRESETS, addDays, addMonths, endOfMonth, endOfWeek, formatDate, monthLabel, presetRange, startOfMonth, startOfWeek, todayStr,
} from '../utils/dates';
import { cowTotals, dailyTotals, monthlyTotals, sessionTotals, weeklyTotals } from '../utils/aggregate';
import { buildReport } from '../utils/report';
import { exportExcel, exportPdf } from '../utils/export';
import { litres, num } from '../utils/format';
import { SESSIONS, sessionLabel } from '../utils/constants';
import { Alert, EmptyState, Field, PageHeader, Spinner } from '../components/ui';
import { BarsChart, CowChart, SessionChart, TrendChart } from '../components/charts';

const TYPES = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'custom', label: 'Custom range' },
  { key: 'cow', label: 'Individual cow' },
  { key: 'session', label: 'By session' },
];

export default function Reports() {
  const { farm } = useAuth();
  const { version } = useData();
  const toast = useToast();
  const today = todayStr();

  const [cows, setCows] = useState([]);
  const [error, setError] = useState('');

  // ----- Graphs -----
  const [preset, setPreset] = useState('last30');
  const [gFrom, setGFrom] = useState(addDays(today, -29));
  const [gTo, setGTo] = useState(today);
  const [graphRecords, setGraphRecords] = useState([]);
  const [yearRecords, setYearRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const [from, to] = preset === 'custom' ? [gFrom, gTo] : presetRange(preset, today);
  const rangeBad = !from || !to || from > to;
  const yearFrom = startOfMonth(addMonths(today, -11));

  useEffect(() => { listCows(farm.id).then(setCows).catch((e) => setError(e.message)); }, [farm.id, version]);

  useEffect(() => {
    if (rangeBad) return;
    let alive = true;
    setLoading(true);
    Promise.all([fetchAllRecords(farm.id, { from, to }), fetchAllRecords(farm.id, { from: yearFrom, to: today })])
      .then(([g, y]) => { if (alive) { setGraphRecords(g); setYearRecords(y); setError(''); setLoading(false); } })
      .catch((e) => { if (alive) { setError(e.message); setLoading(false); } });
    return () => { alive = false; };
  }, [farm.id, from, to, rangeBad, yearFrom, today, version]);

  const charts = useMemo(() => {
    const weekly = weeklyTotals(yearRecords, addDays(startOfWeek(today), -49), today);
    const last = weekly[weekly.length - 1], prev = weekly[weekly.length - 2];
    return {
      daily: rangeBad ? [] : dailyTotals(graphRecords, from, to),
      sessions: sessionTotals(graphRecords),
      cows: cowTotals(graphRecords),
      weekly,
      weekChange: last && prev && prev.total > 0 ? ((last.total - prev.total) / prev.total) * 100 : null,
      lastWeek: last, prevWeek: prev,
      monthly: monthlyTotals(yearRecords, yearFrom, today),
    };
  }, [graphRecords, yearRecords, from, to, rangeBad, today, yearFrom]);

  // ----- Report generator -----
  const [rType, setRType] = useState('daily');
  const [rDate, setRDate] = useState(today);
  const [rMonth, setRMonth] = useState(today.slice(0, 7));
  const [rFrom, setRFrom] = useState(addDays(today, -6));
  const [rTo, setRTo] = useState(today);
  const [rCow, setRCow] = useState('');
  const [rSession, setRSession] = useState('MORNING');
  const [report, setReport] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [rError, setRError] = useState('');

  const generate = async () => {
    setRError('');
    let f, t, title;
    if (rType === 'daily') { f = t = rDate; title = 'Daily production report'; }
    else if (rType === 'weekly') { f = startOfWeek(rDate); t = endOfWeek(rDate); title = 'Weekly production report'; }
    else if (rType === 'monthly') { f = `${rMonth}-01`; t = endOfMonth(f); title = `Monthly production report - ${monthLabel(rMonth)}`; }
    else { f = rFrom; t = rTo; title = rType === 'cow' ? 'Individual cow report' : rType === 'session' ? 'Session production report' : 'Custom period report'; }
    if (!f || !t) return setRError('Choose the date for the report.');
    if (f > t) return setRError('The start date is after the end date.');
    if (rType === 'cow' && !rCow) return setRError('Choose a cow for this report.');

    setGenerating(true);
    try {
      const filters = { from: f, to: t, cowId: rType === 'cow' ? rCow : undefined, session: rType === 'session' ? rSession : undefined };
      const records = await fetchAllRecords(farm.id, filters);
      const cow = cows.find((c) => c.id === rCow);
      setReport(buildReport({
        type: rType, title, from: f, to: t, farmName: farm.farm_name, records,
        activeCows: cows.filter((c) => c.status === 'ACTIVE').length,
        cowName: rType === 'cow' && cow ? `${cow.name} (${cow.ear_tag})` : undefined,
        session: rType === 'session' ? rSession : undefined,
      }));
    } catch (e) { setRError(e.message); }
    setGenerating(false);
  };

  const doExport = (kind) => {
    try { kind === 'pdf' ? exportPdf(report) : exportExcel(report); toast.success(`${kind === 'pdf' ? 'PDF' : 'Excel'} report downloaded.`); }
    catch (e) { toast.error(`The export failed: ${e.message}`); }
  };

  return (
    <>
      <PageHeader title="Reports & Analytics" subtitle="See how your farm is producing and download reports." />
      {error && <Alert>{error}</Alert>}

      {/* ---------- Report generator ---------- */}
      <section className="card" style={{ marginBottom: 20 }}>
        <div className="card-head"><h2>Generate a report</h2></div>
        <div className="tabs">
          {TYPES.map((t) => <button key={t.key} className={`tab ${rType === t.key ? 'active' : ''}`} onClick={() => setRType(t.key)}>{t.label}</button>)}
        </div>
        <div className="filters">
          {rType === 'daily' && <Field label="Date" htmlFor="rd"><input id="rd" type="date" max={today} className="input" value={rDate} onChange={(e) => setRDate(e.target.value)} /></Field>}
          {rType === 'weekly' && (
            <Field label="Any day in the week" htmlFor="rw" hint={rDate ? `Monday ${formatDate(startOfWeek(rDate))} to Sunday ${formatDate(endOfWeek(rDate))}` : ''}>
              <input id="rw" type="date" max={today} className="input" value={rDate} onChange={(e) => setRDate(e.target.value)} />
            </Field>
          )}
          {rType === 'monthly' && <Field label="Month" htmlFor="rm"><input id="rm" type="month" max={today.slice(0, 7)} className="input" value={rMonth} onChange={(e) => setRMonth(e.target.value)} /></Field>}
          {['custom', 'cow', 'session'].includes(rType) && (
            <>
              <Field label="From" htmlFor="rf"><input id="rf" type="date" max={today} className="input" value={rFrom} onChange={(e) => setRFrom(e.target.value)} /></Field>
              <Field label="To" htmlFor="rt"><input id="rt" type="date" max={today} className="input" value={rTo} onChange={(e) => setRTo(e.target.value)} /></Field>
            </>
          )}
          {rType === 'cow' && (
            <Field label="Cow" htmlFor="rc">
              <select id="rc" className="input" value={rCow} onChange={(e) => setRCow(e.target.value)}>
                <option value="">Select a cow…</option>
                {cows.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.ear_tag})</option>)}
              </select>
            </Field>
          )}
          {rType === 'session' && (
            <Field label="Session" htmlFor="rs">
              <select id="rs" className="input" value={rSession} onChange={(e) => setRSession(e.target.value)}>
                {SESSIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </Field>
          )}
          <div className="field" style={{ flex: '0 0 auto' }}>
            <button className="btn" onClick={generate} disabled={generating}><FileBarChart size={18} /> {generating ? 'Generating…' : 'Generate report'}</button>
          </div>
        </div>
        {rError && <div style={{ marginTop: 14 }}><Alert>{rError}</Alert></div>}

        {report && (
          <div style={{ marginTop: 22, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
            <div className="card-head">
              <div>
                <h2>{report.title}</h2>
                <p className="muted">{report.farmName} · {report.periodLabel}{report.cowName ? ` · ${report.cowName}` : ''}{report.session ? ` · ${sessionLabel(report.session)}` : ''}</p>
              </div>
              <div className="header-actions">
                <button className="btn" onClick={() => doExport('pdf')} disabled={!report.records.length}><FileText size={18} /> Download PDF</button>
                <button className="btn btn-outline" onClick={() => doExport('xlsx')} disabled={!report.records.length}><FileSpreadsheet size={18} /> Download Excel</button>
              </div>
            </div>
            {report.records.length === 0 ? (
              <EmptyState icon={FileBarChart} title="No milk was recorded in this period">Choose a different period, or record milk first.</EmptyState>
            ) : (
              <>
                <div className="kv">
                  <div><span>Total milk production</span><b>{litres(report.total)}</b></div>
                  <div><span>Daily average ({report.days} day{report.days > 1 ? 's' : ''})</span><b>{litres(report.dailyAverage)}</b></div>
                  <div><span>Average per active cow</span><b>{litres(report.averagePerCow)}</b></div>
                  <div><span>Highest-producing cow</span><b>{report.top ? `${report.top.name} · ${litres(report.top.total)}` : '—'}</b></div>
                </div>
                <div className="grid grid-2" style={{ marginTop: 18 }}>
                  <div>
                    <h3 style={{ marginBottom: 8 }}>Production per session</h3>
                    <table className="table"><tbody>
                      {SESSIONS.map((s) => <tr key={s.key}><td>{s.label}</td><td className="num"><b>{litres(report.sessions[s.key])}</b></td></tr>)}
                    </tbody></table>
                  </div>
                  <div>
                    <h3 style={{ marginBottom: 8 }}>Production per cow</h3>
                    <table className="table"><tbody>
                      {report.cows.map((c) => <tr key={c.cowId}><td>{c.name} <span className="muted">({c.ear_tag})</span></td><td className="num"><b>{litres(c.total)}</b></td></tr>)}
                    </tbody></table>
                  </div>
                </div>
                <h3 className="section-title">{report.chartTitle}</h3>
                <BarsChart data={report.chart} height={240} />
                <h3 className="section-title">Detailed records ({report.records.length})</h3>
                <div className="table-wrap" style={{ maxHeight: 360, overflowY: 'auto' }}>
                  <table className="table">
                    <thead><tr><th>Date</th><th>Cow</th><th>Session</th><th className="num">Litres</th></tr></thead>
                    <tbody>
                      {report.records.slice(0, 100).map((r) => (
                        <tr key={r.id}><td className="nowrap">{formatDate(r.record_date)}</td><td>{r.cows?.name} <span className="muted">({r.cows?.ear_tag})</span></td><td>{sessionLabel(r.session)}</td><td className="num">{num(r.quantity)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {report.records.length > 100 && <p className="muted small" style={{ marginTop: 8 }}>Showing the first 100 records. The PDF and Excel files contain all {report.records.length}.</p>}
              </>
            )}
          </div>
        )}
      </section>

      {/* ---------- Graphs ---------- */}
      <section className="card" style={{ marginBottom: 20 }}>
        <div className="filters">
          <Field label="Graph period" htmlFor="gp">
            <select id="gp" className="input" value={preset} onChange={(e) => setPreset(e.target.value)}>
              {PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </Field>
          {preset === 'custom' && (
            <>
              <Field label="From" htmlFor="gf"><input id="gf" type="date" max={today} className="input" value={gFrom} onChange={(e) => setGFrom(e.target.value)} /></Field>
              <Field label="To" htmlFor="gt"><input id="gt" type="date" max={today} className="input" value={gTo} onChange={(e) => setGTo(e.target.value)} /></Field>
            </>
          )}
          {!rangeBad && <p className="muted" style={{ alignSelf: 'center' }}>{formatDate(from)} to {formatDate(to)}</p>}
        </div>
        {rangeBad && <div style={{ marginTop: 14 }}><Alert>Choose a start date that is on or before the end date.</Alert></div>}
      </section>

      {loading && !rangeBad ? <Spinner label="Loading graphs…" /> : (
        <div className="grid">
          <section className="card">
            <div className="card-head"><h2>Daily milk production</h2></div>
            <TrendChart data={charts.daily} />
          </section>

          <div className="grid grid-2">
            <section className="card">
              <div className="card-head"><h2>Session comparison</h2></div>
              <SessionChart totals={charts.sessions} />
            </section>
            <section className="card">
              <div className="card-head"><h2>Cow production comparison</h2></div>
              <CowChart cows={charts.cows} />
            </section>
          </div>

          <section className="card">
            <div className="card-head">
              <h2>Weekly production <span className="muted small">last 8 weeks</span></h2>
              {charts.weekChange !== null && (
                <span className="badge" style={charts.weekChange < 0 ? { background: 'var(--danger-bg)', color: 'var(--danger)' } : undefined}>
                  {charts.weekChange < 0 ? <TrendingDown size={14} style={{ verticalAlign: -2 }} /> : <TrendingUp size={14} style={{ verticalAlign: -2 }} />}
                  {' '}{charts.weekChange >= 0 ? '+' : ''}{num(charts.weekChange, 1)}% vs previous week
                </span>
              )}
            </div>
            <BarsChart data={charts.weekly} highlightLast />
            <p className="muted small" style={{ marginTop: 8 }}>
              Weeks start on Monday and are labelled by their first day.
              {charts.lastWeek && charts.prevWeek && ` This week so far: ${litres(charts.lastWeek.total)}. Previous week: ${litres(charts.prevWeek.total)}.`}
            </p>
          </section>

          <section className="card">
            <div className="card-head"><h2>Monthly production <span className="muted small">last 12 months</span></h2></div>
            <BarsChart data={charts.monthly} highlightLast />
          </section>
        </div>
      )}
    </>
  );
}
