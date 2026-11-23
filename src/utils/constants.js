export const SESSIONS = [
  { key: 'MORNING', label: 'Morning' },
  { key: 'LUNCH', label: 'Lunch' },
  { key: 'EVENING', label: 'Evening' },
];
export const sessionLabel = (k) => SESSIONS.find((s) => s.key === k)?.label ?? k;

export const BREEDS = ['Friesian', 'Holstein', 'Ayrshire', 'Jersey', 'Guernsey', 'Brown Swiss', 'Sahiwal', 'Crossbreed'];
