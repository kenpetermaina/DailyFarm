import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import { Alert, Field, PasswordInput } from '../components/ui';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ fullName: '', email: '', password: '', farmName: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!f.fullName.trim()) e.fullName = 'Enter your full name.';
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = 'Enter a valid email address.';
    if (f.password.length < 8) e.password = 'Use at least 8 characters.';
    if (!f.farmName.trim()) e.farmName = 'Enter the name of your farm.';
    if (!/^\+?[0-9\s-]{7,16}$/.test(f.phone.trim())) e.phone = 'Enter a valid phone number, for example +254 700 000 000.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setFormError('');
    if (!validate()) return;
    setBusy(true);
    const { data, error } = await signUp({
      email: f.email.trim(), password: f.password, fullName: f.fullName.trim(),
      phone: f.phone.trim(), farmName: f.farmName.trim(),
    });
    setBusy(false);
    if (error) return setFormError(error.message);
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return setFormError('An account with this email already exists. Try logging in instead.');
    }
    if (data.session) navigate('/', { replace: true });
    else setSent(true); // email confirmation is switched on in Supabase
  };

  if (sent) {
    return (
      <AuthShell>
        <h1>Check your email</h1>
        <p className="sub">We sent a confirmation link to <b>{f.email}</b>. Open it, then log in to start recording milk.</p>
        <Link className="btn btn-block" to="/login">Go to login</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1>Create your farm account</h1>
      <p className="sub">It takes about a minute.</p>
      {formError && <Alert>{formError}</Alert>}
      <form onSubmit={submit} noValidate>
        <Field label="Full name" htmlFor="fullName" required error={errors.fullName}>
          <input id="fullName" className={`input ${errors.fullName ? 'invalid' : ''}`} value={f.fullName} onChange={set('fullName')} autoComplete="name" />
        </Field>
        <Field label="Email" htmlFor="email" required error={errors.email}>
          <input id="email" type="email" className={`input ${errors.email ? 'invalid' : ''}`} value={f.email} onChange={set('email')} autoComplete="email" />
        </Field>
        <Field label="Password" htmlFor="password" required error={errors.password} hint="At least 8 characters.">
          <PasswordInput id="password" value={f.password} onChange={set('password')} autoComplete="new-password" invalid={!!errors.password} />
        </Field>
        <Field label="Farm name" htmlFor="farmName" required error={errors.farmName}>
          <input id="farmName" className={`input ${errors.farmName ? 'invalid' : ''}`} value={f.farmName} onChange={set('farmName')} />
        </Field>
        <Field label="Phone number" htmlFor="phone" required error={errors.phone}>
          <input id="phone" type="tel" className={`input ${errors.phone ? 'invalid' : ''}`} value={f.phone} onChange={set('phone')} autoComplete="tel" />
        </Field>
        <button className="btn btn-lg btn-block" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
      <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
    </AuthShell>
  );
}
