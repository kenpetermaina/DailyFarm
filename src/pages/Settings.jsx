import { useState } from 'react';
import { FlaskConical, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { changePassword, clearSampleData, loadSampleData, updateFarmName, updateProfile } from '../services/accountService';
import { todayStr } from '../utils/dates';
import { Alert, Field, PageHeader, PasswordInput } from '../components/ui';
import { ConfirmDialog } from '../components/Modal';

export default function Settings() {
  const { user, profile, farm, refreshAccount } = useAuth();
  const { notifyChange } = useData();
  const toast = useToast();

  const [name, setName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [farmName, setFarmName] = useState(farm.farm_name);
  const [profileErr, setProfileErr] = useState('');
  const [farmErr, setFarmErr] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingFarm, setSavingFarm] = useState(false);

  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  const [sampleBusy, setSampleBusy] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault(); setProfileErr('');
    if (!name.trim()) return setProfileErr('Enter your full name.');
    if (phone.trim() && !/^\+?[0-9\s-]{7,16}$/.test(phone.trim())) return setProfileErr('Enter a valid phone number.');
    setSavingProfile(true);
    try { await updateProfile(user.id, { full_name: name.trim(), phone: phone.trim() }); await refreshAccount(); toast.success('Your profile was saved.'); }
    catch (err) { setProfileErr(err.message); }
    setSavingProfile(false);
  };

  const saveFarm = async (e) => {
    e.preventDefault(); setFarmErr('');
    if (!farmName.trim()) return setFarmErr('Enter the name of your farm.');
    setSavingFarm(true);
    try { await updateFarmName(farm.id, farmName.trim()); await refreshAccount(); toast.success('Farm name saved.'); }
    catch (err) { setFarmErr(err.message); }
    setSavingFarm(false);
  };

  const savePassword = async (e) => {
    e.preventDefault(); setPwErr('');
    if (!cur) return setPwErr('Enter your current password.');
    if (pw.length < 8) return setPwErr('The new password must have at least 8 characters.');
    if (pw !== pw2) return setPwErr('The two new passwords do not match.');
    setSavingPw(true);
    try { await changePassword(user.email, cur, pw); setCur(''); setPw(''); setPw2(''); toast.success('Your password was changed.'); }
    catch (err) { setPwErr(err.message); }
    setSavingPw(false);
  };

  const addSample = async () => {
    setSampleBusy(true);
    try { await loadSampleData(todayStr()); toast.success('Sample cows and 45 days of milk records were added.'); notifyChange(); }
    catch (err) { toast.error(err.message); }
    setSampleBusy(false);
  };

  const removeSample = async () => {
    setSampleBusy(true);
    try { const n = await clearSampleData(); toast.success(`Sample data removed (${n} records). Your own records were not touched.`); notifyChange(); }
    catch (err) { toast.error(err.message); }
    setSampleBusy(false); setConfirmClear(false);
  };

  return (
    <>
      <PageHeader title="Settings" subtitle={user.email} />
      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <form className="card" onSubmit={saveProfile} noValidate>
          <div className="card-head"><h2>Your profile</h2></div>
          {profileErr && <Alert>{profileErr}</Alert>}
          <Field label="Full name" htmlFor="n" required><input id="n" className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Email" htmlFor="e" hint="Your login email cannot be changed here."><input id="e" className="input" value={user.email} disabled /></Field>
          <Field label="Phone number" htmlFor="p"><input id="p" type="tel" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
          <button className="btn" disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save profile'}</button>
        </form>

        <form className="card" onSubmit={saveFarm} noValidate>
          <div className="card-head"><h2>Farm information</h2></div>
          {farmErr && <Alert>{farmErr}</Alert>}
          <Field label="Farm name" htmlFor="fn" required><input id="fn" className="input" value={farmName} onChange={(e) => setFarmName(e.target.value)} /></Field>
          <p className="muted small" style={{ marginBottom: 16 }}>The farm name appears on the sidebar and on every report.</p>
          <button className="btn" disabled={savingFarm}>{savingFarm ? 'Saving…' : 'Save farm name'}</button>
        </form>

        <form className="card" onSubmit={savePassword} noValidate>
          <div className="card-head"><h2>Change password</h2></div>
          {pwErr && <Alert>{pwErr}</Alert>}
          <Field label="Current password" htmlFor="cp"><PasswordInput id="cp" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" /></Field>
          <Field label="New password" htmlFor="np" hint="At least 8 characters."><PasswordInput id="np" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></Field>
          <Field label="Confirm new password" htmlFor="np2"><PasswordInput id="np2" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" /></Field>
          <button className="btn" disabled={savingPw}>{savingPw ? 'Saving…' : 'Change password'}</button>
        </form>

        <section className="card">
          <div className="card-head"><h2>Sample data</h2></div>
          <p className="muted" style={{ marginBottom: 14 }}>
            Want to look around first? Add five test cows (Daisy, Bella, Misty, Rose and Lucy) with 45 days of milk records.
            Sample items are marked “Sample” and can be removed at any time without touching your real records.
          </p>
          <div className="header-actions">
            <button className="btn" onClick={addSample} disabled={sampleBusy}><FlaskConical size={18} /> Load sample data</button>
            <button className="btn btn-ghost-danger" onClick={() => setConfirmClear(true)} disabled={sampleBusy}><Trash2 size={18} /> Remove sample data</button>
          </div>
        </section>
      </div>

      {confirmClear && (
        <ConfirmDialog title="Remove sample data?" danger confirmLabel="Remove sample data" busy={sampleBusy}
          message="This deletes the sample milk records and the sample cows that have no other records. Records you entered yourself are kept."
          onConfirm={removeSample} onCancel={() => setConfirmClear(false)} />
      )}
    </>
  );
}
