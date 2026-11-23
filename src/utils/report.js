import { daysBetween, formatDate, minDate, monthLabel, todayStr } from './dates';
import { cowTotals, dailyTotals, round2, sessionTotals, sum, weeklyTotals } from './aggregate';
import { sessionLabel } from './constants';

/** Turns raw database records into everything a report needs. Nothing here is sample data. */
export function buildReport({ type, title, from, to, farmName, records, activeCows, cowName, session }) {
  const total = sum(records);
  const days = Math.max(1, daysBetween(from, minDate(to, todayStr())) + 1);
  const cows = cowTotals(records);
  const daily = dailyTotals(records, from, to);
  // Long periods are charted per week so the bars stay readable
  const byWeek = daily.length > 31;
  const chart = byWeek ? weeklyTotals(records, from, to).map((w) => ({ label: w.label, total: w.total })) : daily.map((d) => ({ label: d.label, total: d.total }));
  return {
    type, title, from, to, farmName, cowName, session,
    periodLabel: from === to ? formatDate(from) : `${formatDate(from)} to ${formatDate(to)}`,
    records, total, days,
    dailyAverage: round2(total / days),
    activeCows,
    averagePerCow: activeCows ? round2(total / activeCows) : 0,
    sessions: sessionTotals(records),
    cows, top: cows[0] || null,
    chart, chartTitle: byWeek ? 'Weekly production (litres)' : 'Daily production (litres)',
  };
}

export const monthTitle = (key) => monthLabel(key);
export const sessionText = (k) => sessionLabel(k);
