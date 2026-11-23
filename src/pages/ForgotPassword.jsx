import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import { Alert, Field } from '../components/ui';
import { useAuth } from '../context/AuthContext';

export default function ForgotPassword() {
  const { sendReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address.');
    setBusy(true);
    const { error: err } = await sendReset(email.trim());
    setBusy(false);
    if (err) setError(err.message); else setSent(true);
  };

  return (
    <AuthShell>
      <h1>Reset your password</h1>
      {sent ? (
        <>
          <p className="sub">If an account exists for <b>{email}</b>, a reset link is on its way. Check your inbox.</p>
          <Link className="btn btn-block" to="/login">Back to login</Link>
        </>
      ) : (
        <>
          <p className="sub">Enter your email and we will send you a link to choose a new password.</p>
          {error && <Alert>{error}</Alert>}
          <form onSubmit={submit} noValidate>
            <Field label="Email" htmlFor="email">
              <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </Field>
            <button className="btn btn-lg btn-block" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
          </form>
          <p className="auth-switch"><Link to="/login">Back to login</Link></p>
        </>
      )}
    </AuthShell>
  );
}
