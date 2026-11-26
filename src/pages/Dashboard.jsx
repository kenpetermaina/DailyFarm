import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Milk, Sun, CloudSun, Moon, PawPrint, CalendarDays, Gauge, Plus, Droplets, BarChart3, ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { fetchAllRecords, listRecentRecords } from '../services/milkService';
import { listCows } from '../services/cowService';
import { addDays, daysBetween, formatDate, minDate, startOfMonth, todayStr } from '../utils/dates';
import { sessionTotals, sum, cowTotals, dailyTotals } from '../utils/aggregate';
import { litres, num } from '../utils/format';
import { sessionLabel } from '../utils/constants';
import { Alert, EmptyState, PageHeader } from '../components/ui';

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

  if (state.loading) return (
    <div className="dashboard-page dashboard-skeleton" role="status" aria-label="Loading your dashboard">
      <div className="dashboard-skeleton-head"><i /><i /></div>
      <div className="dashboard-skeleton-actions"><i /><i /><i /></div>
      <div className="dashboard-skeleton-today">
        <div className="dashboard-skeleton-hero"><i /><i /></div>
        <div className="dashboard-skeleton-summary"><i /><i /><i /></div>
      </div>
      <div className="dashboard-skeleton-panels"><i /><i /></div>
      <div className="dashboard-skeleton-table"><i /><i /><i /><i /></div>
    </div>
  );
  const firstName = (profile?.full_name || '').split(' ')[0];
  const topMax = stats.top[0]?.total || 1;
  const trendMax = Math.max(...stats.trend.map((day) => day.total), 1);
  const chartMax = Math.max(45, Math.ceil(trendMax / 45) * 45);
  const chartTicks = Array.from({ length: chartMax / 45 + 1 }, (_, index) => chartMax - index * 45);
  const mostRecentTrendDate = [...stats.trend].reverse().find((day) => day.total > 0)?.date;
  const latestRecord = state.recent[0];
  const latestRecordDaysAgo = latestRecord ? daysBetween(latestRecord.record_date, today) : null;
  const hasMilkToday = stats.total > 0;

  return (
    <div className="dashboard-page">
      <PageHeader title={`Hello${firstName ? `, ${firstName}` : ''}`} subtitle={farm.farm_name}>
        <time className="dashboard-date" dateTime={today}><CalendarDays size={15} />{formatDate(today)}</time>
      </PageHeader>
      {state.error && <Alert>{state.error}</Alert>}

      <div className="quick-actions">
        <button className="btn btn-outline" onClick={() => navigate('/cows?new=1')}><Plus size={16} /> Add Cow</button>
        <button className="btn" onClick={() => navigate('/record-milk')}><Droplets size={16} /> Record Milk</button>
        <button className="btn btn-outline" onClick={() => navigate('/reports')}><BarChart3 size={16} /> View Reports</button>
      </div>

      <section className="dashboard-today" aria-label="Today's milk production">
        <div className="dashboard-today-total">
          <div className="dashboard-eyebrow"><Milk size={16} /> Total milk today</div>
          {hasMilkToday ? (
            <div className="dashboard-hero-value">{num(stats.total)} <small>L</small></div>
          ) : (
            <div className="dashboard-no-milk">
              <span>No milk recorded yet</span>
              <Link to="/record-milk">Record now <span aria-hidden="true">→</span></Link>
            </div>
          )}
        </div>
        <div className={`dashboard-sessions ${hasMilkToday ? '' : 'is-empty'}`}>
          {[
            { key: 'MORNING', label: 'Morning', icon: Sun },
            { key: 'LUNCH', label: 'Lunch', icon: CloudSun },
            { key: 'EVENING', label: 'Evening', icon: Moon },
          ].map(({ key, label, icon: Icon }) => (
            <div className="dashboard-session" key={key}>
              <span className="dashboard-session-name"><Icon size={15} />{label}</span>
              <b>{hasMilkToday ? num(stats.sessions[key]) : '—'}{hasMilkToday && <small> L</small>}</b>
            </div>
          ))}
        </div>

        <div className="dashboard-summary" aria-label="Farm summary">
          <div><PawPrint size={15} /><span>Active cows</span><b>{stats.activeCows}</b></div>
          <div><CalendarDays size={15} /><span>This month</span><b>{num(stats.monthly)} <small>L</small></b></div>
          <div><Gauge size={15} /><span>Average per cow</span><b>{num(stats.average)} <small>L</small></b></div>
        </div>
      </section>

      <div className="grid grid-main">
        <section className="card dashboard-panel dashboard-production">
          <div className="card-head">
            <h2>Milk production</h2>
            <div className="tabs dashboard-tabs" role="group" aria-label="Chart date range">
              {[7, 14, 30].map((d) => (
                <button key={d} className={`tab ${range === d ? 'active' : ''}`} aria-pressed={range === d} onClick={() => setRange(d)}>{d} days</button>
              ))}
            </div>
          </div>
          {stats.trend.some((day) => day.total > 0) ? (
            <div className="dashboard-chart" data-range={range} role="group" aria-label="Daily milk production by date">
              <div className="dashboard-chart-axis" aria-hidden="true">
                {chartTicks.map((tick) => <span key={tick} style={{ '--tick-position': `${100 - (tick / chartMax) * 100}%` }}>{tick}</span>)}
              </div>
              <div className="dashboard-chart-plot">
                <div className="dashboard-chart-grid" aria-hidden="true">
                  {chartTicks.slice(0, -1).map((tick) => (
                    <i key={tick} style={{ top: `${100 - (tick / chartMax) * 100}%` }} />
                  ))}
                </div>
                <div className="dashboard-chart-columns">
                  {stats.trend.map((day) => (
                    <div className="dashboard-chart-column" key={day.date}>
                      {day.total > 0 && <span className="dashboard-chart-value">{num(day.total)} L</span>}
                      <div
                        className={`dashboard-chart-bar ${day.date === mostRecentTrendDate ? 'is-latest' : ''}`}
                        style={{ '--bar-height': `${(day.total / chartMax) * 100}%` }}
                        title={`${day.label}: ${litres(day.total)}${day.date === mostRecentTrendDate ? ' · Most recent day with data' : ''}`}
                        aria-label={`${day.label}: ${litres(day.total)}${day.date === mostRecentTrendDate ? ', most recent day with data' : ''}`}
                        tabIndex={0}
                      >
                        <span className="dashboard-chart-tooltip">{day.label}: {litres(day.total)}</span>
                      </div>
                      <span className="dashboard-chart-label">{day.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState icon={BarChart3} title="No milk recorded for this period">Record milk to see the daily totals.</EmptyState>
          )}
        </section>

        <section className="card dashboard-panel dashboard-top-cows">
          <div className="card-head"><h2>Top cows this month</h2></div>
          {stats.top.length === 0 ? (
            <EmptyState icon={PawPrint} title="No production yet">Record milk to see your best cows.</EmptyState>
          ) : (
            <ul className="rank-list">
              {stats.top.map((c, i) => (
                <li key={c.cowId} className="rank-item">
                  <div className="rank-row">
                    <Link to={`/cows/${c.cowId}`} className="dashboard-cow-link">
                      <span className="dashboard-rank">{i + 1}</span>
                      <span className="dashboard-cow-name">{c.name}<small>{c.ear_tag}</small></span>
                    </Link>
                    <b>{litres(c.total)}</b>
                  </div>
                  <div className="rank-bar"><i style={{ width: `${(c.total / topMax) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
          {latestRecord && (
            <p className={`dashboard-last-record ${latestRecordDaysAgo > 1 ? 'is-stale' : ''}`}>
              <span>Last recorded:</span> {formatDate(latestRecord.record_date)}
              {' ('}
              {latestRecordDaysAgo === 0 ? 'today' : latestRecordDaysAgo === 1 ? 'yesterday' : latestRecordDaysAgo > 1 ? `${latestRecordDaysAgo} days ago` : `in ${Math.abs(latestRecordDaysAgo)} days`}
              {')'}
            </p>
          )}
        </section>
      </div>

      <section className="card dashboard-panel dashboard-records">
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
                    <td className="nowrap" data-label="Date">{formatDate(r.record_date)}</td>
                    <td data-label="Cow">{r.cows?.name} <span className="muted">({r.cows?.ear_tag})</span></td>
                    <td data-label="Session"><span className={`badge dashboard-session-tag session-${String(r.session).toLowerCase()}`}>{sessionLabel(r.session)}</span></td>
                    <td className="num" data-label="Litres"><b>{num(r.quantity)} <small>L</small></b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
