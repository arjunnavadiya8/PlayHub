import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  useEffect(() => {
    if (!localStorage.getItem('playhub_token')) return setLoading(false);
    api('/auth/me').then(data => setUser(data.user)).catch(() => localStorage.removeItem('playhub_token')).finally(() => setLoading(false));
  }, []);

  const openAuth = (mode = 'login') => { setAuthMode(mode); setAuthOpen(true); };
  async function authenticate(mode, values) {
    const payload = mode === 'register' ? { ...values, role: 'customer' } : { email: values.email, password: values.password };
    const data = await api(`/auth/${mode}`, { method: 'POST', body: JSON.stringify(payload) });
    localStorage.setItem('playhub_token', data.token); setUser(data.user); setAuthOpen(false); return data.user;
  }
  async function authenticateOwner(mode, values) {
    const payload = mode === 'register' ? values : { email: values.email, password: values.password };
    const data = await api(`/auth/owner/${mode}`, { method: 'POST', body: JSON.stringify(payload) });
    localStorage.setItem('playhub_token', data.token); setUser(data.user); return data.user;
  }
  function logout() { localStorage.removeItem('playhub_token'); setUser(null); }

  return <AuthContext.Provider value={{ user, loading, authOpen, setAuthOpen, authMode, setAuthMode, openAuth, authenticate, authenticateOwner, logout }}>{children}</AuthContext.Provider>;
}
