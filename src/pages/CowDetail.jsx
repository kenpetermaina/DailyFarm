import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Droplets, Milk, Pencil, PawPrint, Sun, CalendarDays, CalendarRange } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { fetchAllRecords } from '../services/milkService';
import { getCow } from '../services/cowService';
import { endOfWeek, formatDate, startOfMonth, startOfWeek, todayStr, addDays } from '../utils/dates';
import { sum, dailyTotals } from '../utils/aggregate';
import { litres, num } from '../utils/format';
import { Alert, EmptyState, Pagination, Spinner, StatCard } from '../components/ui';
import { Modal } from '../components/Modal';
import CowForm from '../components/CowForm';
import { TrendChart } from '../components/charts';

const PAGE = 15;

export default function CowDetail() {
  const { id } = useParams();
  const { farm } = useAuth();
  const { version, notifyChange } = useData();
  const toast = useToast();
  const [cow, setCow] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [page, setPage] = useState(0);
  const today = todayStr();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const c = await getCow(id);
        if (!c || c.farm_id !== farm.id) { if (alive) { setCow(null); setLoading(false); } return; }
        const recs = await fetchAllRecords(farm.id, { cowId: id });
        if (alive) { setCow(c); setRecords(recs); setError(''); setLoading(false); }
      } catch (e) { if (alive) { setError(e.message); setLoading(false); } }
    })();
    return () => { alive = false; };
  }, [id, farm.id, version]);

  const calc = useMemo(() => {
    const wk = [startOfWeek(today), endOfWeek(today)];
    // History grouped by day, newest first
    const byDay = new Map();
    records.forEach((r) => {
      const d = byDay.get(r.record_date) || { date: r.record_date, MORNING: null, LUNCH: null, EVENING: null, total: 0 };
      d[r.session] = r.quantity; d.total += r.quantity;
      byDay.set(r.record_date, d);
    });
    return {
      total: sum(records),
      today: sum(records.filter((r) => r.record_date === today)),
      week: sum(records.filter((r) => r.record_date >= wk[0] && r.record_date <= wk[1])),
      month: sum(records.filter((r) => r.record_date >= startOfMonth(today))),
      history: [...byDay.values()].sort((a, b) => (a.date < b.date ? 1 : -1)),
      trend: dailyTotals(records, addDays(today, -29), today),
    };
  }, [records, today]);

  if (loading) return <Spinner label="Loading cow…" />;
  if (error) return <Alert>{error}</Alert>;
  if (!cow) return <EmptyState icon={PawPrint} title="Cow not found" action={<Link className="btn" to="/cows">Back to cows</Link>}>This cow does not exist on your farm.</EmptyState>;

  const slice = calc.history.slice(page * PAGE, page * PAGE + PAGE);
  const cell = (v) => (v == null ? <span className="muted">—</span> : num(v));

  return (
    <>
      <p style={{ marginBottom: 14 }}><Link to="/cows" className="btn btn-outline btn-sm"><ArrowLeft size={16} /> All cows</Link></p>
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="cow-hero">
          {cow.photo_url ? <img src={cow.photo_url} alt={cow.name} /> : <div className="ph"><PawPrint size={40} /></div>}
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1>{cow.name} <span className={`badge ${cow.status === 'ACTIVE' ? '' : 'badge-muted'}`} style={{ verticalAlign: 'middle' }}>{cow.status === 'ACTIVE' ? 'Active' : 'Inactive'}</span></h1>
            <p className="muted">Ear tag {cow.ear_tag}</p>
            <div className="kv" style={{ marginTop: 14 }}>
              <div><span>Breed</span><b>{cow.breed || '—'}</b></div>
              <div><span>Date of birth</span><b>{cow.date_of_birth ? formatDate(cow.date_of_birth) : '—'}</b></div>
              <div><span>Weight</span><b>{cow.weight ? `${num(cow.weight)} kg` : '—'}</b></div>
            </div>
            {cow.notes && <p style={{ marginTop: 12 }}><span className="muted">Notes: </span>{cow.notes}</p>}
          </div>
          <div className="header-actions">
            <Link className="btn" to="/record-milk" state={{ cowId: cow.id }}><Droplets size={18} /> Record milk</Link>
            <button className="btn btn-outline" onClick={() => setEditing(true)}><Pencil size={18} /> Edit</button>
          </div>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard primary icon={Milk} label="Total milk produced" value={num(calc.total)} unit="L" />
        <StatCard icon={Sun} label="Today" value={num(calc.today)} unit="L" />
        <StatCard icon={CalendarRange} label="This week" value={num(calc.week)} unit="L" />
        <StatCard icon={CalendarDays} label="This month" value={num(calc.month)} unit="L" />
      </div>

      <section className="card" style={{ marginBottom: 18 }}>
        <div className="card-head"><h2>Last 30 days</h2></div>
        <TrendChart data={calc.trend} height={260} />
      </section>

      <section className="card">
        <div className="card-head"><h2>Production history</h2><span className="muted small">{records.length} records</span></div>
        {calc.history.length === 0 ? (
          <EmptyState icon={Droplets} title={`No milk recorded for ${cow.name} yet`}>Records will appear here once you save them.</EmptyState>
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Date</th><th className="num">Morning</th><th className="num">Lunch</th><th className="num">Evening</th><th className="num">Total (L)</th></tr></thead>
                <tbody>
                  {slice.map((d) => (
                    <tr key={d.date}>
                      <td className="nowrap">{formatDate(d.date)}</td>
                      <td className="num">{cell(d.MORNING)}</td><td className="num">{cell(d.LUNCH)}</td><td className="num">{cell(d.EVENING)}</td>
                      <td className="num"><b>{num(d.total)}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE} total={calc.history.length} onPage={setPage} />
          </>
        )}
      </section>

      {editing && (
        <Modal title={`Edit ${cow.name}`} onClose={() => setEditing(false)}>
          <CowForm cow={cow} onCancel={() => setEditing(false)}
            onSaved={(c) => { setEditing(false); setCow(c); toast.success(`${c.name} was updated.`); notifyChange(); }} />
        </Modal>
      )}
    </>
  );
}
