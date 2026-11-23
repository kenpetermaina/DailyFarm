import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import { Alert, Field, PasswordInput } from '../components/ui';
import { useAuth } from '../context/AuthContext';

const LOGIN_HERO_IMAGES = [
  { src: '/dairy-cow-login.png', alt: 'Black and white dairy cow grazing in a green pasture' },
  { src: '/dairy-cow-login-2.png', alt: 'Brown dairy cow standing in a grassy field' },
  { src: '/dairy-cow-login-3.png', alt: 'Black and white dairy cow standing in a green pasture' },
];

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) return setError('Enter your email and password.');
    setBusy(true);
    const { error: err } = await signIn(email.trim(), password);
    setBusy(false);
    if (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'The email or password is not correct. Please try again.'
        : err.message === 'Email not confirmed'
        ? 'Please confirm your email first. Check your inbox for the confirmation link.'
        : err.message);
      return;
    }
    navigate(location.state?.from?.pathname || '/', { replace: true });
  };

  return (
    <AuthShell heroImages={LOGIN_HERO_IMAGES}>
      <h1>Welcome back</h1>
      <p className="sub">Log in to see your farm.</p>
      {error && <Alert>{error}</Alert>}
      <form onSubmit={submit} noValidate>
        <Field label="Email" htmlFor="email">
          <div className="input-icon"><Mail size={18} />
            <input id="email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
        </Field>
        <Field label="Password" htmlFor="password">
          <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </Field>
        <p className="small" style={{ marginBottom: 16, textAlign: 'right' }}><Link to="/forgot-password">Forgot your password?</Link></p>
        <button className="btn btn-lg btn-block" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
      <p className="auth-switch">New here? <Link to="/register">Create your farm account</Link></p>
    </AuthShell>
  );
}
