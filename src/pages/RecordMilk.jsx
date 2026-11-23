import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, Droplets, PawPrint, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { listCows } from '../services/cowService';
import { createRecord, fetchAllRecords, findRecord } from '../services/milkService';
import { validateMilk } from '../utils/validation';
import { addDays, formatDate, todayStr } from '../utils/dates';
import { sum } from '../utils/aggregate';
import { litres, num } from '../utils/format';
import { sessionLabel } from '../utils/constants';
import { Alert, EmptyState, Field, PageHeader, Spinner } from '../components/ui';
import { SessionPicker } from '../components/SessionPicker';
import MilkEditModal from '../components/MilkEditModal';
import QuickMilkEntry from '../components/QuickMilkEntry';
import { Link } from 'react-router-dom';

export default function RecordMilk() {
  const { farm } = useAuth();
  const { version, notifyChange } = useData();
  const toast = useToast();
  const location = useLocation();
  const [cows, setCows] = useState([]);
  const [dayRecords, setDayRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordsError, setRecordsError] = useState('');
  const [mode, setMode] = useState('quick');
  const [cowId, setCowId] = useState(location.state?.cowId ?? '');
  const [session, setSession] = useState('');
  const [quantity, setQuantity] = useState('');
  const [date, setDate] = useState(todayStr());
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [duplicate, setDuplicate] = useState(null);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    listCows(farm.id).then((all) => alive && setCows(all.filter((c) => c.status === 'ACTIVE')))
      .catch((e) => alive && setFormError(e.message)).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [farm.id, version]);

  // Records already saved for the chosen date, used to flag cows that are done
  useEffect(() => {
    let alive = true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setRecordsLoading(false);
      return () => { alive = false; };
    }
    setRecordsLoading(true);
    setRecordsError('');
    fetchAllRecords(farm.id, { from: date, to: date })
      .then((r) => alive && setDayRecords(r))
      .catch((error) => alive && setRecordsError(error.message))
      .finally(() => alive && setRecordsLoading(false));
    return () => { alive = false; };
  }, [farm.id, date, version]);

  const recordedIds = useMemo(
    () => new Set(dayRecords.filter((r) => r.session === session).map((r) => r.cow_id)),
    [dayRecords, session]
  );
  const sessionRecords = dayRecords.filter((r) => r.record_date === date && r.session === session);

  const handleQuickSaved = (saved) => {
    setDayRecords((records) => [saved, ...records.filter((record) => record.id !== saved.id)]);
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError(''); setDuplicate(null);
    const v = validateMilk({ cowId, session, quantity, date });
    setErrors(v.errors);
    if (Object.keys(v.errors).length) return;
    setBusy(true);
    try {
      const saved = await createRecord({
        farm_id: farm.id, cow_id: cowId, session, quantity: v.quantity, record_date: date, notes: notes.trim() || null,
      });
      toast.success(`Saved ${litres(saved.quantity)} for ${saved.cows?.name} (${sessionLabel(saved.session)}).`);
      // Keep date and session so the next cow can be entered straight away
      setCowId(''); setQuantity(''); setNotes(''); setErrors({});
      notifyChange();
    } catch (err) {
      if (err.code === '23505') {
        try { setDuplicate(await findRecord(cowId, date, session)); }
        catch { setFormError(err.message); }
      } else setFormError(err.message);
    }
    setBusy(false);
  };

  if (loading) return <Spinner label="Loading cows…" />;

  if (cows.length === 0) {
    return (
      <>
        <PageHeader title="Record Milk" />
        <div className="card">
          <EmptyState icon={PawPrint} title="Add a cow first" action={<Link className="btn" to="/cows?new=1">Add a cow</Link>}>
            You need at least one active cow before you can record milk.
          </EmptyState>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Record Milk" subtitle="Choose the cow and session, then enter the litres." />
      <div className="tabs" role="tablist" aria-label="Milk recording method">
        <button type="button" className={`tab ${mode === 'quick' ? 'active' : ''}`} role="tab"
          aria-selected={mode === 'quick'} aria-controls="quick-entry-panel"
          onClick={() => setMode('quick')}>Quick entry</button>
        <button type="button" className={`tab ${mode === 'single' ? 'active' : ''}`} role="tab"
          aria-selected={mode === 'single'} aria-controls="single-entry-panel"
          onClick={() => setMode('single')}>One cow at a time</button>
      </div>

      {mode === 'quick' ? (
        <section id="quick-entry-panel" role="tabpanel" className="quick-entry-panel">
          <div className="card quick-controls">
            <Field label="Milking session" required error={errors.session}>
              <SessionPicker value={session} onChange={(value) => { setSession(value); setDuplicate(null); }} />
            </Field>
            <div className="quick-date-field">
              <Field label="Recording date" htmlFor="quick-date" required error={errors.date}>
                <input id="quick-date" type="date" max={todayStr()} className={`input ${errors.date ? 'invalid' : ''}`}
                  value={date} onChange={(event) => { setDate(event.target.value); setDuplicate(null); }} />
              </Field>
              <div className="quick-date-actions" aria-label="Choose a date">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setDate(todayStr())}>Today</button>
                <button type="button" className="btn btn-outline btn-sm" disabled={addDays(todayStr(), -1) > todayStr()}
                  onClick={() => setDate(addDays(todayStr(), -1))}>Yesterday</button>
              </div>
            </div>
            {recordsError && <Alert>{`Could not load saved records: ${recordsError}`}</Alert>}
          </div>
          <QuickMilkEntry
            farmId={farm.id}
            cows={cows}
            records={sessionRecords.filter((record) => cows.some((cow) => cow.id === record.cow_id))}
            date={date}
            session={session}
            loading={recordsLoading}
            onSaved={handleQuickSaved}
            onBatchSaved={notifyChange}
          />
        </section>
      ) : (
      <div id="single-entry-panel" role="tabpanel" className="grid grid-main">
        <form className="card" onSubmit={submit} noValidate>
          {formError && <Alert>{formError}</Alert>}
          {duplicate && (
            <div className="alert alert-warn" role="alert">
              <AlertTriangle size={18} />
              <div>
                <b>This milk is already recorded.</b> {duplicate.cows?.name} has {litres(duplicate.quantity)} saved for {sessionLabel(duplicate.session)} on {formatDate(duplicate.record_date)}.
                <div style={{ marginTop: 8 }}>
                  <button type="button" className="btn btn-sm" onClick={() => setEditing(duplicate)}>Edit existing record</button>
                </div>
              </div>
            </div>
          )}

          <Field label="Milking session" required error={errors.session}>
            <SessionPicker value={session} onChange={(s) => { setSession(s); setDuplicate(null); }} />
          </Field>

          <div className="form-grid">
            <Field label="Cow" htmlFor="cow" required error={errors.cowId} className="full">
              <select id="cow" className={`input ${errors.cowId ? 'invalid' : ''}`} value={cowId} onChange={(e) => { setCowId(e.target.value); setDuplicate(null); }}>
                <option value="">Select a cow…</option>
                {cows.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.ear_tag}){session && recordedIds.has(c.id) ? ' — already recorded' : ''}</option>
                ))}
              </select>
            </Field>
            <Field label="Milk quantity (litres)" htmlFor="qty" required error={errors.quantity} hint="For example 5.5 or 12.75">
              <input id="qty" className={`input ${errors.quantity ? 'invalid' : ''}`} inputMode="decimal" autoComplete="off" value={quantity}
                onChange={(e) => { setQuantity(e.target.value); setDuplicate(null); }} placeholder="0.0" />
            </Field>
            <Field label="Recording date" htmlFor="date" required error={errors.date}>
              <input id="date" type="date" max={todayStr()} className={`input ${errors.date ? 'invalid' : ''}`} value={date} onChange={(e) => { setDate(e.target.value); setDuplicate(null); }} />
            </Field>
            <Field label="Notes" htmlFor="notes" className="full">
              <textarea id="notes" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
            </Field>
          </div>
          <button className="btn btn-lg btn-block" disabled={busy}><Save size={20} /> {busy ? 'Saving…' : 'Save record'}</button>
        </form>

        <aside className="card" style={{ alignSelf: 'start' }}>
          <div className="card-head">
            <h2>{session ? `${sessionLabel(session)} · ${formatDate(date)}` : 'Recorded so far'}</h2>
          </div>
          {!session ? (
            <p className="muted">Pick a session to see what has been recorded for {formatDate(date)}.</p>
          ) : sessionRecords.length === 0 ? (
            <EmptyState icon={Droplets} title="Nothing recorded yet">{cows.length} cows are waiting for this session.</EmptyState>
          ) : (
            <>
              <p style={{ marginBottom: 12 }}><b>{litres(sum(sessionRecords))}</b> from {sessionRecords.length} of {cows.length} cows</p>
              <ul className="rank-list">
                {sessionRecords.map((r) => (
                  <li key={r.id} className="rank-row">
                    <span>{r.cows?.name} <span className="muted">({r.cows?.ear_tag})</span></span>
                    <b>{num(r.quantity)} L</b>
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
      </div>
      )}

      {editing && (
        <MilkEditModal record={editing} onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); setDuplicate(null); setCowId(''); setQuantity(''); toast.success('Record updated.'); notifyChange(); }} />
      )}
    </>
  );
}
