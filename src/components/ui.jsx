import { AlertCircle, CheckCircle2, Eye, EyeOff, Inbox } from 'lucide-react';
import { useState } from 'react';

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="center-box" role="status">
      <div className="spinner" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, children, action }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon size={26} /></div>
      <b>{title}</b>
      {children && <p>{children}</p>}
      {action && <div className="empty-actions">{action}</div>}
    </div>
  );
}

export function Alert({ type = 'error', children }) {
  const Icon = type === 'success' ? CheckCircle2 : AlertCircle;
  return (
    <div className={`alert alert-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <Icon size={18} />
      <div>{children}</div>
    </div>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="header-actions">{children}</div>}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, unit, primary }) {
  return (
    <div className={`card stat-card ${primary ? 'primary' : ''}`}>
      <div className="stat-icon"><Icon size={22} /></div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}{unit && <small>{unit}</small>}</div>
      </div>
    </div>
  );
}

export function Field({ label, htmlFor, required, hint, error, className = '', children }) {
  return (
    <div className={`field ${className}`}>
      <label htmlFor={htmlFor}>{label}{required && <span className="req"> *</span>}</label>
      {children}
      {hint && !error && <span className="hint">{hint}</span>}
      {error && <span className="error">{error}</span>}
    </div>
  );
}

export function PasswordInput({ id, value, onChange, autoComplete, invalid, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw-wrap">
      <input id={id} className={`input ${invalid ? 'invalid' : ''}`} type={show ? 'text' : 'password'} value={value}
        onChange={onChange} autoComplete={autoComplete} placeholder={placeholder} />
      <button type="button" className="icon-btn pw-toggle" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export function Pagination({ page, pageSize, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <div className="pager">
      <span className="muted small">Showing {from}–{to} of {total}</span>
      <div className="header-actions">
        <button className="btn btn-outline btn-sm" disabled={page === 0} onClick={() => onPage(page - 1)}>Previous</button>
        <span className="small" style={{ alignSelf: 'center' }}>Page {page + 1} of {pages}</span>
        <button className="btn btn-outline btn-sm" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}
