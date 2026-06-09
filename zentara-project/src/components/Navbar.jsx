import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { IMGS } from '../assets/images';
import './Navbar.css';

const NAV_LINKS = [
  { to: '/',       label: 'HOME' },
  { to: '/shop',   label: 'SHOP' },
  { to: '/track',  label: 'TRACK' },
  { to: '/member', label: 'MEMBER' },
];

export default function Navbar() {
  const { count }    = useCart();
  const { user }     = useAuth();
  const { pathname } = useLocation();
  const navigate     = useNavigate();
  const [scrolled, setScrolled]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const isHome = pathname === '/';

  return (
    <>
      <nav className={`navbar${scrolled ? ' scrolled' : ''}${isHome && !scrolled ? ' home' : ''}`}>
        <div className="nav-inner container">
          {/* Logo */}
          <Link to="/" className="nav-logo">
            <span className="nav-logo-text">ZENTARA</span>
          </Link>

          {/* Desktop Links */}
          <ul className="nav-links">
            {NAV_LINKS.map(l => (
              <li key={l.to}>
                <Link to={l.to} className={`nav-link${pathname === l.to ? ' active' : ''}`}>
                  {l.label}
                </Link>
              </li>
            ))}
            {user?.role === 'admin' && (
              <li>
                <Link to="/admin" className={`nav-link${pathname === '/admin' ? ' active' : ''}`}>
                  ADMIN
                </Link>
              </li>
            )}
          </ul>

          {/* Right actions */}
          <div className="nav-actions">
            <button
              className="nav-cart-btn"
              onClick={() => navigate('/cart')}
              aria-label="Cart"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 01-8 0"/>
              </svg>
              {count > 0 && <span className="cart-badge">{count > 9 ? '9+' : count}</span>}
            </button>

            {/* Hamburger */}
            <button
              className={`nav-hamburger${menuOpen ? ' open' : ''}`}
              onClick={() => setMenuOpen(v => !v)}
              aria-label="Menu"
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile overlay */}
      {menuOpen && (
        <div className="mobile-overlay" onClick={() => setMenuOpen(false)}>
          <div className="mobile-menu" onClick={e => e.stopPropagation()}>
            <ul>
              {NAV_LINKS.map(l => (
                <li key={l.to}>
                  <Link to={l.to} className={`mobile-link${pathname === l.to ? ' active' : ''}`}>
                    {l.label}
                  </Link>
                </li>
              ))}
              {user?.role === 'admin' && (
                <li><Link to="/admin" className="mobile-link">ADMIN</Link></li>
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
