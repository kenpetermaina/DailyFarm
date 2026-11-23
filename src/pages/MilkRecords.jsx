import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, ClipboardList, Droplets, Pencil, Search, Sun, CloudSun, Moon, Milk, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useDebounce } from '../hooks/useDebounce';
import { listCows } from '../services/cowService';
import { deleteRecord, fetchAllRecords, listRecordsPage } from '../services/milkService';
import { formatDate, formatDateTime } from '../utils/dates';
import { sessionTotals, sum } from '../utils/aggregate';
import { num } from '../utils/format';
import { SESSIONS, sessionLabel } from '../utils/constants';
import { Alert, EmptyState, PageHeader, Pagination, Spinner, StatCard } from '../components/ui';
import { ConfirmDialog } from '../components/Modal';
import MilkEditModal from '../components/MilkEditModal';

const PAGE_SIZE = 15;
const EMPTY = { search: '', cowId: '', session: '', from: '', to: '' };

export default function MilkRecords() {
  const { farm } = useAuth();
  const { version, notifyChange } = useData();
  const toast = useToast();
  const [cows, setCows] = useState([]);
  const [filters, setFilters] = useState(EMPTY);
  const [ascending, setAscending] = useState(false);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [summary, setSummary] = useState({ total: 0, MORNING: 0, LUNCH: 0, EVENING: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const search = useDebounce(filters.search.trim().toLowerCase(), 300);

  const update = (patch) => { setFilters((f) => ({ ...f, ...patch })); setPage(0); };
  const badRange = filters.from && filters.to && filters.from > filters.to;

  useEffect(() => { listCows(farm.id).then(setCows).catch((e) => setError(e.message)); }, [farm.id, version]);

  const query = useMemo(() => {
    const q = { cowId: filters.cowId || undefined, session: filters.session || undefined, from: filters.from || undefined, to: filters.to || undefined };
    if (search) q.cowIds = cows.filter((c) => c.name.toLowerCase().includes(search) || c.ear_tag.toLowerCase().includes(search)).map((c) => c.id);
    return q;
  }, [filters.cowId, filters.session, filters.from, filters.to, search, cows]);

  useEffect(() => {
    if (badRange) { setLoading(false); return; }
    let alive = true;
    setLoading(true);
    Promise.all([
      listRecordsPage(farm.id, query, { page, pageSize: PAGE_SIZE, ascending }),
      fetchAllRecords(farm.id, query, 'quantity, session'),
    ]).then(([p, all]) => {
      if (!alive) return;
      if (p.rows.length === 0 && page > 0) { setPage(page - 1); return; }
      setRows(p.rows); setCount(p.count); setError('');
      setSummary({ total: sum(all), ...sessionTotals(all) });
      setLoading(false);
    }).catch((e) => { if (alive) { setError(e.message); setLoading(false); } });
    return () => { alive = false; };
  }, [farm.id, query, page, ascending, version, badRange]);

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await deleteRecord(deleting.id);
      toast.success('Record deleted.');
      notifyChange();
    } catch (e) { toast.error(e.message); }
    setBusy(false); setDeleting(null);
  };

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <>
      <PageHeader title="Milk Records" subtitle="Every milking you have recorded.">
        <Link className="btn" to="/record-milk"><Droplets size={18} /> Record milk</Link>
      </PageHeader>
      {error && <Alert>{error}</Alert>}

      <div className="stat-grid five">
        <StatCard primary icon={Milk} label="Total milk" value={num(summary.total)} unit="L" />
        <StatCard icon={Sun} label="Morning" value={num(summary.MORNING)} unit="L" />
        <StatCard icon={CloudSun} label="Lunch" value={num(summary.LUNCH)} unit="L" />
        <StatCard icon={Moon} label="Evening" value={num(summary.EVENING)} unit="L" />
        <StatCard icon={ClipboardList} label="Records" value={count} />
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="filters">
          <div className="field grow">
            <label htmlFor="s">Search cow</label>
            <div className="input-icon"><Search size={18} />
              <input id="s" className="input" placeholder="Cow name or ear tag" value={filters.search} onChange={(e) => update({ search: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="c">Cow</label>
            <select id="c" className="input" value={filters.cowId} onChange={(e) => update({ cowId: e.target.value })}>
              <option value="">All cows</option>
              {cows.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.ear_tag})</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="se">Session</label>
            <select id="se" className="input" value={filters.session} onChange={(e) => update({ session: e.target.value })}>
              <option value="">All sessions</option>
              {SESSIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f">From date</label>
            <input id="f" type="date" className="input" value={filters.from} onChange={(e) => update({ from: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="t">To date</label>
            <input id="t" type="date" className="input" value={filters.to} onChange={(e) => update({ to: e.target.value })} />
          </div>
          {hasFilters && <button className="btn btn-outline" onClick={() => { setFilters(EMPTY); setPage(0); }}>Clear filters</button>}
        </div>
        <p className="muted small" style={{ marginTop: 10 }}>To see one day, set the same date in both date boxes.</p>
        {badRange && <div style={{ marginTop: 10 }}><Alert>The “From” date is after the “To” date.</Alert></div>}
      </div>

      <div className="card">
        {loading ? <Spinner label="Loading records…" /> : rows.length === 0 ? (
          <EmptyState icon={ClipboardList} title={hasFilters ? 'No records match these filters' : 'No milk records yet'}
            action={!hasFilters && <Link className="btn" to="/record-milk">Record milk</Link>}>
            {hasFilters ? 'Try changing or clearing the filters.' : 'Saved milk records will be listed here.'}
          </EmptyState>
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>
                      <button className="sort-btn" onClick={() => { setAscending((a) => !a); setPage(0); }} aria-label="Sort by date">
                        Date {ascending ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                      </button>
                    </th>
                    <th>Cow name</th><th>Cow ID</th><th>Session</th><th className="num">Quantity (L)</th><th>Recorded at</th><th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="nowrap">{formatDate(r.record_date)}</td>
                      <td><Link to={`/cows/${r.cow_id}`}>{r.cows?.name}</Link></td>
                      <td>{r.cows?.ear_tag}</td>
                      <td><span className="badge">{sessionLabel(r.session)}</span></td>
                      <td className="num"><b>{num(r.quantity)}</b></td>
                      <td className="nowrap muted">{formatDateTime(r.created_at)}</td>
                      <td className="actions">
                        <button className="icon-btn" title="Edit" aria-label="Edit record" onClick={() => setEditing(r)}><Pencil size={18} /></button>
                        <button className="icon-btn" title="Delete" aria-label="Delete record" onClick={() => setDeleting(r)}><Trash2 size={18} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={count} onPage={setPage} />
          </>
        )}
      </div>

      {editing && (
        <MilkEditModal record={editing} onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); toast.success('Record updated.'); notifyChange(); }} />
      )}
      {deleting && (
        <ConfirmDialog title="Delete this record?" danger confirmLabel="Delete record" busy={busy}
          message={`${deleting.cows?.name}: ${num(deleting.quantity)} L, ${sessionLabel(deleting.session)} on ${formatDate(deleting.record_date)}. This cannot be undone.`}
          onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />
      )}
    </>
  );
}
