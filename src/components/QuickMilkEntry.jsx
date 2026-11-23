import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Save } from 'lucide-react';
import { createRecord, updateRecord } from '../services/milkService';
import { parseQuantity, validateMilk } from '../utils/validation';
import { litres } from '../utils/format';
import { sum } from '../utils/aggregate';

export default function QuickMilkEntry({ farmId, cows, records, date, session, loading, onSaved, onBatchSaved }) {
  const [drafts, setDrafts] = useState({});
  const [rowErrors, setRowErrors] = useState({});
  const [rowStates, setRowStates] = useState({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const inputRefs = useRef({});

  useEffect(() => {
    setDrafts({});
    setRowErrors({});
    setRowStates({});
    setFormError('');
  }, [date, session]);

  const recordsByCow = useMemo(
    () => new Map(records.map((record) => [record.cow_id, record])),
    [records]
  );
  const total = sum(cows.map((cow) => {
    const record = recordsByCow.get(cow.id);
    const draft = drafts[cow.id];
    if (draft !== undefined && draft.trim() !== '') {
      const quantity = parseQuantity(draft);
      if (Number.isFinite(quantity) && quantity > 0) return { quantity };
    }
    return record ?? { quantity: 0 };
  }));
  const recordedCount = records.filter((record) => recordsByCow.has(record.cow_id)).length;

  const changeDraft = (cowId, value) => {
    setDrafts((current) => ({ ...current, [cowId]: value }));
    setRowErrors((current) => ({ ...current, [cowId]: '' }));
    setRowStates((current) => ({
      ...current,
      [cowId]: value.trim() ? { type: 'ready', message: 'Not saved yet' } : undefined,
    }));
    setFormError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setFormError('');
    const rows = cows
      .filter((cow) => drafts[cow.id] !== undefined && drafts[cow.id].trim() !== '')
      .map((cow) => {
        const record = recordsByCow.get(cow.id);
        const validation = validateMilk({ cowId: cow.id, session, quantity: drafts[cow.id], date });
        return { cow, record, validation };
      });

    if (rows.length === 0) {
      setFormError('Enter litres for at least one cow.');
      return;
    }

    const nextErrors = {};
    const readyRows = [];
    rows.forEach(({ cow, record, validation }) => {
      if (Object.keys(validation.errors).length) {
        nextErrors[cow.id] = validation.errors.quantity || validation.errors.session || validation.errors.date;
        setRowStates((current) => ({
          ...current,
          [cow.id]: { type: 'error', message: nextErrors[cow.id] },
        }));
      } else {
        readyRows.push({ cow, record, quantity: validation.quantity });
      }
    });
    setRowErrors(nextErrors);
    if (readyRows.length === 0) return;

    setBusy(true);
    setRowStates((current) => {
      const next = { ...current };
      readyRows.forEach(({ cow }) => { next[cow.id] = { type: 'saving', message: 'Saving…' }; });
      return next;
    });

    const results = await Promise.all(readyRows.map(async ({ cow, record, quantity }) => {
      try {
        const saved = record
          ? await updateRecord(record.id, { quantity })
          : await createRecord({
            farm_id: farmId,
            cow_id: cow.id,
            session,
            quantity,
            record_date: date,
          });
        onSaved(saved);
        setDrafts((current) => {
          const next = { ...current };
          delete next[cow.id];
          return next;
        });
        setRowStates((current) => ({
          ...current,
          [cow.id]: { type: 'saved', message: 'Saved' },
        }));
        return { success: true };
      } catch (error) {
        const message = error.code === '23505'
          ? 'Already recorded. Check the saved amount.'
          : 'Could not save. Please try again.';
        setRowErrors((current) => ({ ...current, [cow.id]: message }));
        setRowStates((current) => ({
          ...current,
          [cow.id]: { type: 'error', message },
        }));
        return { success: false };
      }
    }));

    const savedCount = results.filter((result) => result.success).length;
    if (savedCount > 0) {
      onBatchSaved();
      setFormError(savedCount === results.length
        ? `${savedCount} ${savedCount === 1 ? 'record' : 'records'} saved.`
        : `${savedCount} ${savedCount === 1 ? 'record' : 'records'} saved. Check the rows that could not be saved.`);
    }
    setBusy(false);
  };

  const moveToNextCow = (index) => {
    const nextCow = cows[index + 1];
    if (nextCow) inputRefs.current[nextCow.id]?.focus();
  };

  return (
    <form className="card quick-entry" onSubmit={submit} noValidate>
      <div className="quick-progress" role="status" aria-live="polite">
        <b>{recordedCount} of {cows.length} cows recorded</b>
        <span>Current total: <b>{litres(total)}</b></span>
      </div>

      {formError && (
        <div className={`alert ${formError.includes('could not') ? 'alert-warn' : 'alert-success'}`} role="status">
          {formError}
        </div>
      )}

      <div className="quick-cow-list">
        {cows.map((cow, index) => {
          const record = recordsByCow.get(cow.id);
          const value = drafts[cow.id] ?? (record ? String(record.quantity) : '');
          const rowState = rowStates[cow.id] ?? (record ? { type: 'saved', message: 'Saved' } : null);
          const error = rowErrors[cow.id];
          const inputId = `quick-milk-${cow.id}`;
          const statusId = `quick-status-${cow.id}`;
          const errorId = `quick-error-${cow.id}`;
          return (
            <div className="quick-cow-row" key={cow.id}>
              <div className="quick-cow-info">
                <label htmlFor={inputId}>{cow.name}</label>
                <span className="muted">{cow.ear_tag}</span>
              </div>
              <div className="quick-cow-input">
                <input
                  ref={(element) => { inputRefs.current[cow.id] = element; }}
                  id={inputId}
                  className={`input ${error ? 'invalid' : ''}`}
                  inputMode="decimal"
                  autoComplete="off"
                  value={value}
                  disabled={!session || loading || busy}
                  placeholder="Litres"
                  aria-label={`Milk for ${cow.name}`}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? errorId : rowState ? statusId : undefined}
                  onChange={(event) => changeDraft(cow.id, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      moveToNextCow(index);
                    }
                  }}
                />
                <span className={`quick-row-status ${rowState?.type ?? ''}`} id={error ? errorId : statusId}>
                  {rowState?.type === 'saved' && <CheckCircle2 size={16} aria-hidden="true" />}
                  {rowState?.type === 'error' && <AlertCircle size={16} aria-hidden="true" />}
                  {rowState?.message ?? ' '}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <button className="btn btn-lg btn-block quick-save" disabled={busy || loading || !session}>
        <Save size={20} /> {busy ? 'Saving…' : 'Save all'}
      </button>
    </form>
  );
}
