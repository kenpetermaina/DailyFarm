import { Sun, CloudSun, Moon } from 'lucide-react';

const ITEMS = [
  { key: 'MORNING', label: 'MORNING', Icon: Sun },
  { key: 'LUNCH', label: 'LUNCH', Icon: CloudSun },
  { key: 'EVENING', label: 'EVENING', Icon: Moon },
];

export function SessionPicker({ value, onChange, disabled }) {
  return (
    <div className="session-picker" role="radiogroup" aria-label="Milking session">
      {ITEMS.map(({ key, label, Icon }) => (
        <button key={key} type="button" role="radio" aria-checked={value === key} disabled={disabled}
          className={`session-btn ${value === key ? 'selected' : ''}`} onClick={() => onChange(key)}>
          <Icon size={28} />
          {label}
        </button>
      ))}
    </div>
  );
}
