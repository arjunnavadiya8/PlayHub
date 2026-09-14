import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext.jsx';

export default function Header() {
  const { user, openAuth, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return <header className={`site-header ${pathname !== '/' ? 'solid' : ''}`}><Link className="brand" to="/"><span className="brand-mark">P</span><span>Play<span>Hub</span></span></Link><nav className="desktop-nav"><NavLink to="/">Discover</NavLink><a href="/#venues">Venues</a>{user?.role === 'customer' && <NavLink to="/bookings">My bookings</NavLink>}{user?.role === 'owner' && <NavLink to="/owner">Owner dashboard</NavLink>}<a href="/#how">How it works</a></nav><div className="header-actions">{user ? <><span className="user-chip">Hi, {user.name.split(' ')[0]}</span><button className="login-btn" onClick={() => { logout(); navigate('/'); }}>Log out</button></> : <><button className="login-btn" onClick={() => openAuth('login')}>Log in</button><button className="primary small" onClick={() => openAuth('register')}>Sign up</button></>}</div></header>;
}
