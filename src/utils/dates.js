// All dates are handled as local "YYYY-MM-DD" strings so the farm's own
// calendar day is used everywhere (no UTC shifting).
const pad = (n) => String(n).padStart(2, '0');

export const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayStr = () => toDateStr(new Date());
export const parseDate = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const isValidDateStr = (s) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false;
  return toDateStr(parseDate(s)) === s;
};
export const addDays = (s, n) => {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
};
export const addMonths = (s, n) => {
  const d = parseDate(s);
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  return toDateStr(d);
};
export const startOfMonth = (s) => s.slice(0, 8) + '01';
export const endOfMonth = (s) => {
  const d = parseDate(s);
  return toDateStr(new Date(d.getFullYear(), d.getMonth() + 1, 0));
};
// Weeks run Monday to Sunday
export const startOfWeek = (s) => {
  const d = parseDate(s);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toDateStr(d);
};
export const endOfWeek = (s) => addDays(startOfWeek(s), 6);
export const minDate = (a, b) => (a < b ? a : b);
export const daysBetween = (from, to) => Math.round((parseDate(to) - parseDate(from)) / 86400000);
export const eachDay = (from, to) => {
  const out = [];
  let cur = from;
  while (cur <= to && out.length < 800) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Consistent display format everywhere: 21 Nov 2026
export const formatDate = (s) => {
  if (!s) return '';
  const d = parseDate(s);
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
export const shortDate = (s) => {
  const d = parseDate(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};
export const monthLabel = (key) => {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};
export const formatDateTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${formatDate(toDateStr(d))}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const PRESETS = [
  { key: 'last7', label: 'Last 7 days' },
  { key: 'last30', label: 'Last 30 days' },
  { key: 'thisMonth', label: 'This month' },
  { key: 'lastMonth', label: 'Last month' },
  { key: 'custom', label: 'Custom date range' },
];

export function presetRange(preset, today = todayStr()) {
  switch (preset) {
    case 'last7': return [addDays(today, -6), today];
    case 'last30': return [addDays(today, -29), today];
    case 'thisMonth': return [startOfMonth(today), today];
    case 'lastMonth': {
      const prevEnd = addDays(startOfMonth(today), -1);
      return [startOfMonth(prevEnd), prevEnd];
    }
    default: return [addDays(today, -6), today];
  }
}
