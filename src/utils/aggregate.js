import { eachDay, startOfWeek, addDays, shortDate, monthLabel, startOfMonth, addMonths } from './dates';

export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
export const sum = (records) => round2(records.reduce((a, r) => a + Number(r.quantity), 0));

export function sessionTotals(records) {
  const t = { MORNING: 0, LUNCH: 0, EVENING: 0 };
  records.forEach((r) => { t[r.session] += Number(r.quantity); });
  return { MORNING: round2(t.MORNING), LUNCH: round2(t.LUNCH), EVENING: round2(t.EVENING) };
}

export function dailyTotals(records, from, to) {
  const map = new Map();
  records.forEach((r) => {
    const m = map.get(r.record_date) || { MORNING: 0, LUNCH: 0, EVENING: 0 };
    m[r.session] += Number(r.quantity);
    map.set(r.record_date, m);
  });
  return eachDay(from, to).map((date) => {
    const m = map.get(date) || { MORNING: 0, LUNCH: 0, EVENING: 0 };
    const total = m.MORNING + m.LUNCH + m.EVENING;
    return { date, label: shortDate(date), MORNING: round2(m.MORNING), LUNCH: round2(m.LUNCH), EVENING: round2(m.EVENING), total: round2(total) };
  });
}

export function weeklyTotals(records, from, to) {
  const weeks = [];
  for (let s = startOfWeek(from); s <= to; s = addDays(s, 7)) {
    const e = addDays(s, 6);
    const total = sum(records.filter((r) => r.record_date >= s && r.record_date <= e));
    weeks.push({ start: s, end: e, label: shortDate(s), total });
  }
  return weeks;
}

export function monthlyTotals(records, from, to) {
  const out = [];
  for (let s = startOfMonth(from); s <= to; s = addMonths(s, 1)) {
    const key = s.slice(0, 7);
    const total = sum(records.filter((r) => r.record_date.startsWith(key)));
    out.push({ key, label: monthLabel(key), total });
  }
  return out;
}

export function cowTotals(records) {
  const map = new Map();
  records.forEach((r) => {
    const cur = map.get(r.cow_id) || { cowId: r.cow_id, name: r.cows?.name ?? 'Unknown', ear_tag: r.cows?.ear_tag ?? '', total: 0 };
    cur.total += Number(r.quantity);
    map.set(r.cow_id, cur);
  });
  return [...map.values()].map((c) => ({ ...c, total: round2(c.total) })).sort((a, b) => b.total - a.total);
}
