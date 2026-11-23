import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import { Alert, Field, PasswordInput, Spinner } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';

export default function ResetPassword() {
  const navigate = useNavigate();
  const toast = useToast();
  const [ready, setReady] = useState(false);
  const [checked, setChecked] = useState(false);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // The email link signs the user in with a short-lived recovery session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') { setReady(true); setChecked(true); }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    const t = setTimeout(() => setChecked(true), 1500);
    return () => { subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (pw.length < 8) return setError('Use at least 8 characters.');
    if (pw !== pw2) return setError('The two passwords do not match.');
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (err) return setError(err.message);
    toast.success('Password changed. You are logged in.');
    navigate('/', { replace: true });
  };

  if (!checked && !ready) return <AuthShell><Spinner label="Checking your link…" /></AuthShell>;

  return (
    <AuthShell>
      <h1>Choose a new password</h1>
      {!ready ? (
        <>
          <Alert>This reset link is not valid or has expired. Request a new one.</Alert>
          <Link className="btn btn-block" to="/forgot-password">Request a new link</Link>
        </>
      ) : (
        <>
          <p className="sub">Pick a password you have not used before.</p>
          {error && <Alert>{error}</Alert>}
          <form onSubmit={submit} noValidate>
            <Field label="New password" htmlFor="pw" hint="At least 8 characters.">
              <PasswordInput id="pw" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
            </Field>
            <Field label="Confirm new password" htmlFor="pw2">
              <PasswordInput id="pw2" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
            </Field>
            <button className="btn btn-lg btn-block" disabled={busy}>{busy ? 'Saving…' : 'Save new password'}</button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
