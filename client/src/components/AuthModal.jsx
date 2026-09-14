import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext.jsx';

export default function AuthModal() {
  const { authOpen, setAuthOpen, authMode, setAuthMode, authenticate } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!authOpen) return null;

  const submit = async event => {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      await authenticate(authMode, values);
      navigate('/', { replace: true });
    } catch (submitError) { setError(submitError.message); }
    finally { setBusy(false); }
  };

  const switchMode = () => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setError(''); };

  return <div className="modal open"><div className="modal-backdrop" onClick={() => setAuthOpen(false)} /><div className="modal-panel"><button className="modal-close" onClick={() => setAuthOpen(false)}>×</button><h2>{authMode === 'login' ? 'Player login' : 'Create your player account'}</h2><p className="sub">{authMode === 'login' ? 'Log in to book courts and manage your games.' : 'Sign up as a player to find and book sports venues.'}</p><form className="stack-form" onSubmit={submit}>{authMode === 'register' && <><input required placeholder="Full name" value={values.name} onChange={event => setValues({ ...values, name: event.target.value })} /><input placeholder="Mobile number" value={values.phone} onChange={event => setValues({ ...values, phone: event.target.value })} /></>}<input required type="email" placeholder="Email address" value={values.email} onChange={event => setValues({ ...values, email: event.target.value })} /><input required minLength="8" type="password" placeholder="Password (8+ characters)" value={values.password} onChange={event => setValues({ ...values, password: event.target.value })} />{error && <p className="form-error">{error}</p>}<button className="primary wide" disabled={busy}>{busy ? 'Please wait…' : authMode === 'login' ? 'Player login →' : 'Create player account →'}</button></form><button className="switch-auth" onClick={switchMode}>{authMode === 'login' ? 'New player? Create an account' : 'Already registered? Log in'}</button></div></div>;
}
