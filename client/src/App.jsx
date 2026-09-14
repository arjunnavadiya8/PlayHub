import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import AuthModal from './components/AuthModal.jsx';
import Home from './pages/Home.jsx';
import MyBookings from './pages/MyBookings.jsx';
import OwnerDashboard from './pages/OwnerDashboard.jsx';
import OwnerAuth from './pages/OwnerAuth.jsx';
import { useAuth } from './state/AuthContext.jsx';

function CustomerRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="role-loading">Loading PlayHub…</div>;
  if (user?.role === 'owner') return <Navigate to="/owner" replace />;
  return children;
}

function OwnerRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="role-loading">Loading owner workspace…</div>;
  if (!user) return <Navigate to="/owner/login" replace />;
  if (user.role !== 'owner') return <Navigate to="/" replace />;
  return children;
}

function RoleHome() {
  const { user, loading } = useAuth();
  if (loading) return <div className="role-loading">Loading PlayHub…</div>;
  if (user?.role === 'owner') return <Navigate to="/owner" replace />;
  return <Home />;
}

export default function App() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const ownerSession = !loading && user?.role === 'owner';
  const ownerLayout = location.pathname.startsWith('/owner') || ownerSession;

  return <>
    {!ownerLayout && <Header />}
    <Routes>
      <Route path="/" element={<RoleHome />} />
      <Route path="/bookings" element={<CustomerRoute><MyBookings /></CustomerRoute>} />
      <Route path="/owner/login" element={<OwnerAuth />} />
      <Route path="/owner/*" element={<OwnerRoute><OwnerDashboard /></OwnerRoute>} />
      <Route path="*" element={<Navigate to={ownerSession ? '/owner' : '/'} replace />} />
    </Routes>
    {!ownerLayout && <footer className="customer-footer"><div className="footer-brand"><span className="brand"><span className="brand-mark">P</span><span>Play<span>Hub</span></span></span><p>Book your court. Bring your team.<br />Make the memory.</p></div><div className="footer-links"><section><b>Explore</b><a href="/#venues">Find venues</a><a href="/#how">How it works</a><Link to="/bookings">My bookings</Link></section><section><b>For venues</b><Link to="/owner/login">List your turf</Link><Link to="/owner/login">Owner login</Link></section><section><b>Support</b><a href="mailto:support@playhub.local">Help centre</a><a href="/#how">Booking guide</a></section></div><div className="footer-bottom"><small>© 2026 PlayHub Surat</small><span>Same turf. More memories.</span></div></footer>}
    <AuthModal />
  </>;
}
