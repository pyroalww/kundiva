import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';

import { login } from '../api/auth';
import { useAuth } from '../hooks/useAuth';
import { extractErrorMessage } from '../utils/errorMessage';

export const LoginPage: React.FC = () => {
  const { login: authLogin, user } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const result = await login({ identifier: identifier.trim(), password });
      authLogin(result, remember);

      // Redirect to profile completion if not completed
      if (!result.user.profileCompleted) {
        nav('/complete-profile');
      } else {
        const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
        nav(from ?? '/');
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Giriş sırasında bir hata oluştu.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card fade-in-up" style={{ maxWidth: '440px', margin: '3rem auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <span className="badge badge-glow" style={{ marginBottom: '0.75rem', display: 'inline-block' }}>🔑</span>
        <h1>Giriş Yap</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Hesap bilgilerinizle giriş yapın. Hesap oluşturma yalnızca yöneticiler tarafından yapılabilir.
        </p>
      </div>
      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      <form onSubmit={handleSubmit} className="form-grid">
        <div className="form-group">
          <label htmlFor="identifier">Kullanıcı adı veya e-posta</label>
          <input
            id="identifier"
            className="input"
            type="text"
            required
            autoComplete="username"
            placeholder="Kullanıcı adınız veya e-posta adresiniz"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Şifre</label>
          <input
            id="password"
            className="input"
            type="password"
            required
            autoComplete="current-password"
            placeholder="Şifreniz"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <label
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}
        >
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          Beni hatırla
        </label>
        <button className="button" type="submit" disabled={loading}>
          {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
        Hesabınız yok mu? <a href="/register" style={{ color: 'var(--primary)', fontWeight: 500 }}>Kayıt Talebi Gönderin</a>
      </p>
    </section>
  );
};
