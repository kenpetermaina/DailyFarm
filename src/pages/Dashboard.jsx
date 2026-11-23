import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Milk, Sun, CloudSun, Moon, PawPrint, CalendarDays, Gauge, Plus, Droplets, BarChart3, ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { fetchAllRecords, listRecentRecords } from '../services/milkService';
import { listCows } from '../services/cowService';
import { addDays, formatDate, minDate, startOfMonth, todayStr } from '../utils/dates';
import { sessionTotals, sum, cowTotals, dailyTotals } from '../utils/aggregate';
import { litres, num } from '../utils/format';
import { sessionLabel } from '../utils/constants';
import { Alert, EmptyState, PageHeader, Spinner, StatCard } from '../components/ui';
import { TrendChart } from '../components/charts';

export default function Dashboard() {
  const { farm, profile } = useAuth();
  const { version } = useData();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: '', records: [], cows: [], recent: [] });
  const [range, setRange] = useState(14);
  const today = todayStr();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const monthStart = startOfMonth(today);
        const from = minDate(monthStart, addDays(today, -29));
        const [records, cows, recent] = await Promise.all([
          fetchAllRecords(farm.id, { from, to: today }),
          listCows(farm.id),
          listRecentRecords(farm.id, 8),
        ]);
        if (alive) setState({ loading: false, error: '', records, cows, recent });
      } catch (e) {
        if (alive) setState((s) => ({ ...s, loading: false, error: e.message }));
      }
    })();
    return () => { alive = false; };
  }, [farm.id, version, today]);

  const stats = useMemo(() => {
    const { records, cows } = state;
    const todays = records.filter((r) => r.record_date === today);
    const month = records.filter((r) => r.record_date >= startOfMonth(today));
    const sessions = sessionTotals(todays);
    const activeCows = cows.filter((c) => c.status === 'ACTIVE').length;
    const total = sum(todays);
    return {
      total, sessions, activeCows,
      monthly: sum(month),
      average: activeCows ? total / activeCows : 0,
      top: cowTotals(month).slice(0, 5),
      trend: dailyTotals(records, addDays(today, -(range - 1)), today),
    };
  }, [state, today, range]);

  if (state.loading) return <Spinner label="Loading your dashboard…" />;
  const firstName = (profile?.full_name || '').split(' ')[0];
  const topMax = stats.top[0]?.total || 1;

  return (
    <>
      <PageHeader title={`Hello${firstName ? `, ${firstName}` : ''}`} subtitle={`${farm.farm_name} · ${formatDate(today)}`} />
      {state.error && <Alert>{state.error}</Alert>}

      <div className="quick-actions">
        <button className="btn" onClick={() => navigate('/cows?new=1')}><Plus size={18} /> Add Cow</button>
        <button className="btn" onClick={() => navigate('/record-milk')}><Droplets size={18} /> Record Milk</button>
        <button className="btn btn-outline" onClick={() => navigate('/reports')}><BarChart3 size={18} /> View Reports</button>
      </div>

      <div className="stat-grid">
        <StatCard primary icon={Milk} label="Total milk today" value={num(stats.total)} unit="L" />
        <StatCard icon={Sun} label="Morning production" value={num(stats.sessions.MORNING)} unit="L" />
        <StatCard icon={CloudSun} label="Lunch production" value={num(stats.sessions.LUNCH)} unit="L" />
        <StatCard icon={Moon} label="Evening production" value={num(stats.sessions.EVENING)} unit="L" />
        <StatCard icon={PawPrint} label="Active cows" value={stats.activeCows} />
        <StatCard icon={CalendarDays} label="This month" value={num(stats.monthly)} unit="L" />
        <StatCard icon={Gauge} label="Average per cow today" value={num(stats.average)} unit="L" />
      </div>

      <div className="grid grid-main">
        <section className="card">
          <div className="card-head">
            <h2>Milk production</h2>
            <div className="tabs" style={{ margin: 0 }}>
              {[7, 14, 30].map((d) => (
                <button key={d} className={`tab ${range === d ? 'active' : ''}`} onClick={() => setRange(d)}>{d} days</button>
              ))}
            </div>
          </div>
          <TrendChart data={stats.trend} />
        </section>

        <section className="card">
          <div className="card-head"><h2>Top cows this month</h2></div>
          {stats.top.length === 0 ? (
            <EmptyState icon={PawPrint} title="No production yet">Record milk to see your best cows.</EmptyState>
          ) : (
            <ul className="rank-list">
              {stats.top.map((c, i) => (
                <li key={c.cowId} className="rank-item">
                  <div className="rank-row">
                    <Link to={`/cows/${c.cowId}`}><b>{i + 1}. {c.name}</b> <span className="muted">({c.ear_tag})</span></Link>
                    <b>{litres(c.total)}</b>
                  </div>
                  <div className="rank-bar"><i style={{ width: `${(c.total / topMax) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card" style={{ marginTop: 18 }}>
        <div className="card-head">
          <h2>Recent milk records</h2>
          <Link className="btn btn-outline btn-sm" to="/milk-records">View all</Link>
        </div>
        {state.recent.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No milk records yet"
            action={<Link className="btn" to="/record-milk"><Droplets size={18} /> Record milk</Link>}>
            Your latest entries will show up here.
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Date</th><th>Cow</th><th>Session</th><th className="num">Litres</th></tr></thead>
              <tbody>
                {state.recent.map((r) => (
                  <tr key={r.id}>
                    <td className="nowrap">{formatDate(r.record_date)}</td>
                    <td>{r.cows?.name} <span className="muted">({r.cows?.ear_tag})</span></td>
                    <td><span className="badge">{sessionLabel(r.session)}</span></td>
                    <td className="num"><b>{num(r.quantity)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
