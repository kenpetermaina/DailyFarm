import { isValidDateStr, todayStr } from './dates';

/** Parses "5.5" or "5,5" into a number. Returns NaN when not a valid amount. */
export function parseQuantity(text) {
  const t = String(text ?? '').trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return NaN;
  return Number(t);
}

export function validateMilk({ cowId, session, quantity, date }) {
  const e = {};
  if (!cowId) e.cowId = 'Choose a cow.';
  if (!session) e.session = 'Choose a milking session.';
  const q = parseQuantity(quantity);
  if (String(quantity ?? '').trim() === '') e.quantity = 'Enter the litres of milk.';
  else if (Number.isNaN(q)) e.quantity = 'Enter a number such as 5.5. Use up to 2 decimal places.';
  else if (q <= 0) e.quantity = 'Litres must be greater than zero.';
  else if (q > 100) e.quantity = 'That is more than 100 litres. Please check the amount.';
  if (!isValidDateStr(date)) e.date = 'Enter a valid date.';
  else if (date > todayStr()) e.date = 'The date cannot be in the future.';
  return { errors: e, quantity: q };
}
