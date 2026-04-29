import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';

export const NavBar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const isActive = (path: string, opts?: { startsWith?: boolean }) =>
    opts?.startsWith ? location.pathname.startsWith(path) : location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const roleLabel =
    user?.role === 'TEACHER' ? 'Öğretmen' : user?.role === 'ADMIN' ? 'Yönetici' : 'Öğrenci';

  return (
    <header className={`nav ${scrolled ? 'nav--scrolled' : ''}`}>
      <div className="nav-inner">
        {/* Brand */}
        <Link to="/" className="brand">
          <span className="brand-icon">K</span>
          <div className="brand-text">
            <span className="brand-mark">Kundiva</span>
            <span className="brand-tagline">TÜBİTAK 4006</span>
          </div>
        </Link>

        {/* Mobile toggle */}
        <button
          className={`nav-toggle ${menuOpen ? 'open' : ''}`}
          type="button"
          aria-label="Menüyü aç/kapat"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <span /><span /><span />
        </button>

        {/* Links */}
        <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <div className="nav-group">
            <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
              Ana Sayfa
            </Link>
            <Link
              to="/questions/discover"
              className={`nav-link ${isActive('/questions', { startsWith: true }) ? 'active' : ''}`}
            >
              Soru Havuzu
            </Link>
            <Link
              to="/leaderboard"
              className={`nav-link ${isActive('/leaderboard') ? 'active' : ''}`}
            >
              Liderlik
            </Link>
            {user && (
              <Link
                to="/library"
                className={`nav-link ${isActive('/library') ? 'active' : ''}`}
              >
                Kütüphane
              </Link>
            )}
            <Link
              to="/support"
              className={`nav-link ${isActive('/support') ? 'active' : ''}`}
            >
              Destek
            </Link>
          </div>

          <div className="nav-divider" />

          <div className="nav-group nav-group--end">
            {user && (
              <>
                {user.role === 'STUDENT' && (
                  <Link
                    to="/student/dashboard"
                    className={`nav-link ${isActive('/student', { startsWith: true }) ? 'active' : ''}`}
                  >
                    Panelim
                  </Link>
                )}
                {user.role === 'TEACHER' && (
                  <Link
                    to="/teacher/queue"
                    className={`nav-link ${isActive('/teacher', { startsWith: true }) ? 'active' : ''}`}
                  >
                    Öğretmen Paneli
                  </Link>
                )}
                {user.role === 'ADMIN' && (
                  <Link
                    to="/admin"
                    className={`nav-link ${isActive('/admin') ? 'active' : ''}`}
                  >
                    Yönetim
                  </Link>
                )}

                <div className="nav-user">
                  <div className="nav-avatar">{user.firstName.charAt(0)}</div>
                  <div className="nav-user-meta">
                    <span className="nav-user-name">{user.firstName}</span>
                    <span className="nav-user-role">{roleLabel} · {user.totalPoints ?? 0}✦</span>
                  </div>
                </div>

                <button className="nav-link nav-link--logout" type="button" onClick={handleLogout}>
                  Çıkış
                </button>
              </>
            )}

            {!user && (
              <Link to="/login" className="button nav-cta">
                Giriş Yap
              </Link>
            )}

            {user?.role === 'STUDENT' && (
              <Link to="/student/ask" className="button nav-cta">
                + Soru Sor
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};
