import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext.jsx';

const emptyForm = { name: '', phone: '', email: '', password: '' };

export default function OwnerAuth() {
  const { user, loading, authenticateOwner } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [values, setValues] = useState(emptyForm);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return <div className="role-loading">Loading owner portal…</div>;
  if (user?.role === 'owner') return <Navigate to="/owner" replace />;

  const changeMode = nextMode => { setMode(nextMode); setError(''); };
  const update = event => setValues(current => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async event => {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      await authenticateOwner(mode, values);
      navigate('/owner', { replace: true });
    } catch (submitError) { setError(submitError.message); }
    finally { setBusy(false); }
  };

  return <main className="owner-auth-page">
    <section className="owner-auth-intro">
      <Link className="owner-auth-brand" to="/"><span className="brand-mark">P</span><span>Play<span>Hub</span></span></Link>
      <div><p className="owner-auth-eyebrow">FOR TURF OWNERS</p><h1>Run every court.<br /><em>Grow every game.</em></h1><p>Manage venues, courts, schedules, pricing and bookings from one dedicated owner workspace.</p><ul><li>Live court and slot management</li><li>Venue-specific booking analytics</li><li>Secure owner-only access</li></ul></div>
      <small>PlayHub Venue Partner Portal</small>
    </section>
    <section className="owner-auth-form-wrap">
      <div className="owner-auth-form-card">
        <div className="owner-auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => changeMode('login')}>Owner login</button><button className={mode === 'register' ? 'active' : ''} onClick={() => changeMode('register')}>Create owner account</button></div>
        <p className="owner-auth-kicker">VENUE PARTNER ACCESS</p>
        <h2>{mode === 'login' ? 'Welcome back, owner' : 'Partner with PlayHub'}</h2>
        <p className="owner-auth-sub">{mode === 'login' ? 'Sign in to manage your venues and today’s bookings.' : 'Create an owner account, then list and configure your first venue.'}</p>
        <form className="owner-auth-form" onSubmit={submit}>
          {mode === 'register' && <div className="owner-auth-pair"><label>FULL NAME<input required name="name" value={values.name} onChange={update} placeholder="Your full name" /></label><label>MOBILE NUMBER<input name="phone" value={values.phone} onChange={update} placeholder="10-digit mobile number" /></label></div>}
          <label>EMAIL ADDRESS<input required name="email" type="email" autoComplete="email" value={values.email} onChange={update} placeholder="owner@example.com" /></label>
          <label>PASSWORD<input required name="password" type="password" minLength="8" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={values.password} onChange={update} placeholder="Minimum 8 characters" /></label>
          {error && <p className="form-error">{error}</p>}
          <button className="owner-auth-submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Open owner dashboard →' : 'Create owner account →'}</button>
        </form>
        <p className="owner-auth-player">Looking to book a turf? <Link to="/">Return to the player website</Link></p>
      </div>
    </section>
  </main>;
}
