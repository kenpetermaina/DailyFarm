export const num = (n, max = 2) =>
  Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: max });
export const litres = (n) => `${Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} L`;
export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || 'F';
