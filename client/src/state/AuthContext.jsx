import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api.js';
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); const [loading, setLoading] = useState(true); const [authOpen, setAuthOpen] = useState(false);
  useEffect(() => { if (!localStorage.getItem('playhub_token')) return setLoading(false); api('/auth/me').then(d => setUser(d.user)).catch(() => localStorage.removeItem('playhub_token')).finally(() => setLoading(false)); }, []);
  async function authenticate(mode, values) { const data = await api(`/auth/${mode}`, { method: 'POST', body: JSON.stringify(values) }); localStorage.setItem('playhub_token', data.token); setUser(data.user); setAuthOpen(false); return data.user; }
  function logout() { localStorage.removeItem('playhub_token'); setUser(null); }
  return <AuthContext.Provider value={{ user, loading, authOpen, setAuthOpen, authenticate, logout }}>{children}</AuthContext.Provider>;
}
