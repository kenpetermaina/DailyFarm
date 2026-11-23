import { useState } from 'react';
import { Alert, Field } from './ui';
import { BREEDS } from '../utils/constants';
import { isValidDateStr, todayStr } from '../utils/dates';
import { createCow, updateCow, uploadCowPhoto } from '../services/cowService';
import { useAuth } from '../context/AuthContext';

export default function CowForm({ cow, onSaved, onCancel }) {
  const { farm } = useAuth();
  const editing = Boolean(cow);
  const [f, setF] = useState({
    name: cow?.name ?? '', ear_tag: cow?.ear_tag ?? '', breed: cow?.breed ?? '',
    date_of_birth: cow?.date_of_birth ?? '', weight: cow?.weight ?? '', status: cow?.status ?? 'ACTIVE', notes: cow?.notes ?? '',
  });
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const onFile = (e) => {
    const picked = e.target.files?.[0];
    if (!picked) return setFile(null);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(picked.type)) {
      setErrors((x) => ({ ...x, photo: 'Choose a JPG, PNG or WebP picture.' }));
      return setFile(null);
    }
    if (picked.size > 5 * 1024 * 1024) {
      setErrors((x) => ({ ...x, photo: 'The picture must be smaller than 5 MB.' }));
      return setFile(null);
    }
    setErrors((x) => ({ ...x, photo: undefined }));
    setFile(picked);
  };

  const validate = () => {
    const e = {};
    if (!f.name.trim()) e.name = 'Enter the cow\'s name.';
    if (!f.ear_tag.trim()) e.ear_tag = 'Enter the ear tag or ID number.';
    if (!f.breed.trim()) e.breed = 'Choose or type the breed.';
    if (!isValidDateStr(f.date_of_birth)) e.date_of_birth = 'Enter the date of birth.';
    else if (f.date_of_birth > todayStr()) e.date_of_birth = 'The date of birth cannot be in the future.';
    if (f.weight !== '' && !(Number(f.weight) > 0)) e.weight = 'Weight must be a number greater than zero.';
    if (errors.photo) e.photo = errors.photo;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setFormError('');
    if (!validate()) return;
    setBusy(true);
    try {
      const payload = {
        name: f.name.trim(), ear_tag: f.ear_tag.trim().toUpperCase(), breed: f.breed.trim(),
        date_of_birth: f.date_of_birth, weight: f.weight === '' ? null : Number(f.weight),
        status: f.status, notes: f.notes.trim() || null,
      };
      if (file) payload.photo_url = await uploadCowPhoto(farm.id, file);
      const saved = editing ? await updateCow(cow.id, payload) : await createCow({ ...payload, farm_id: farm.id });
      onSaved(saved, editing);
    } catch (e) {
      setFormError(e.message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      {formError && <Alert>{formError}</Alert>}
      <div className="form-grid">
        <Field label="Cow name" htmlFor="name" required error={errors.name}>
          <input id="name" className={`input ${errors.name ? 'invalid' : ''}`} value={f.name} onChange={set('name')} />
        </Field>
        <Field label="Ear tag / ID number" htmlFor="ear_tag" required error={errors.ear_tag} hint="Must be different for every cow.">
          <input id="ear_tag" className={`input ${errors.ear_tag ? 'invalid' : ''}`} value={f.ear_tag} onChange={set('ear_tag')} />
        </Field>
        <Field label="Breed" htmlFor="breed" required error={errors.breed}>
          <input id="breed" list="breeds" className={`input ${errors.breed ? 'invalid' : ''}`} value={f.breed} onChange={set('breed')} />
          <datalist id="breeds">{BREEDS.map((b) => <option key={b} value={b} />)}</datalist>
        </Field>
        <Field label="Date of birth" htmlFor="dob" required error={errors.date_of_birth}>
          <input id="dob" type="date" max={todayStr()} className={`input ${errors.date_of_birth ? 'invalid' : ''}`} value={f.date_of_birth} onChange={set('date_of_birth')} />
        </Field>
        <Field label="Status" htmlFor="status" required>
          <select id="status" className="input" value={f.status} onChange={set('status')}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </Field>
        <Field label="Weight (kg)" htmlFor="weight" error={errors.weight}>
          <input id="weight" type="number" inputMode="decimal" step="0.1" min="0" className={`input ${errors.weight ? 'invalid' : ''}`} value={f.weight} onChange={set('weight')} />
        </Field>
        <Field label="Photograph" htmlFor="photo" error={errors.photo} className="full" hint={editing && cow.photo_url ? 'Choose a new picture to replace the current one.' : 'Optional. JPG, PNG or WebP, up to 5 MB.'}>
          <input id="photo" type="file" accept="image/jpeg,image/png,image/webp" className="input" onChange={onFile} />
        </Field>
        <Field label="Notes" htmlFor="notes" className="full">
          <textarea id="notes" className="input" value={f.notes} onChange={set('notes')} />
        </Field>
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add cow'}</button>
      </div>
    </form>
  );
}
