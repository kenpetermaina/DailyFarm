import { useState } from 'react';
import { Modal } from './Modal';
import { SessionPicker } from './SessionPicker';
import { Alert, Field } from './ui';
import { updateRecord } from '../services/milkService';
import { validateMilk } from '../utils/validation';
import { todayStr } from '../utils/dates';

export default function MilkEditModal({ record, onClose, onSaved }) {
  const [quantity, setQuantity] = useState(String(record.quantity));
  const [session, setSession] = useState(record.session);
  const [date, setDate] = useState(record.record_date);
  const [notes, setNotes] = useState(record.notes ?? '');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    const v = validateMilk({ cowId: record.cow_id, session, quantity, date });
    setErrors(v.errors);
    if (Object.keys(v.errors).length) return;
    setBusy(true);
    try {
      const saved = await updateRecord(record.id, { quantity: v.quantity, session, record_date: date, notes: notes.trim() || null });
      onSaved(saved);
    } catch (err) {
      setFormError(err.code === '23505'
        ? 'This cow already has a record for that date and session. Pick a different session or date, or edit the other record.'
        : err.message);
      setBusy(false);
    }
  };

  return (
    <Modal title="Edit milk record" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        {formError && <Alert>{formError}</Alert>}
        <p style={{ marginBottom: 16 }}><b>{record.cows?.name}</b> <span className="muted">({record.cows?.ear_tag})</span></p>
        <Field label="Milking session" required error={errors.session}>
          <SessionPicker value={session} onChange={setSession} />
        </Field>
        <div className="form-grid">
          <Field label="Milk quantity (litres)" htmlFor="eq" required error={errors.quantity}>
            <input id="eq" className={`input ${errors.quantity ? 'invalid' : ''}`} inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </Field>
          <Field label="Recording date" htmlFor="ed" required error={errors.date}>
            <input id="ed" type="date" max={todayStr()} className={`input ${errors.date ? 'invalid' : ''}`} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Notes" htmlFor="en"><textarea id="en" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <div className="form-actions">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
        </div>
      </form>
    </Modal>
  );
}
