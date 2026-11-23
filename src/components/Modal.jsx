import { useEffect } from 'react';
import { X } from 'lucide-react';

export function Modal({ title, onClose, children, size }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size === 'sm' ? 'sm' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger, busy, onConfirm, onCancel }) {
  return (
    <Modal title={title} onClose={onCancel} size="sm">
      <p style={{ marginBottom: 20 }}>{message}</p>
      <div className="form-actions">
        <button className="btn btn-outline" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className={`btn ${danger ? 'btn-danger' : ''}`} onClick={onConfirm} disabled={busy}>
          {busy ? 'Please wait…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
