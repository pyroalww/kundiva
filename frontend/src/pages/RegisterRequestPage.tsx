import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { submitRegistrationRequest } from '../api/profile';
import { useAuth } from '../hooks/useAuth';
import { extractErrorMessage } from '../utils/errorMessage';

export const RegisterRequestPage: React.FC = () => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [desiredUsername, setDesiredUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [studentIdFile, setStudentIdFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== passwordConfirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    if (password.length < 8) {
      setError('Şifre en az 8 karakter olmalıdır.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const formData = new FormData();
      formData.append('desiredUsername', desiredUsername.trim());
      formData.append('password', password);
      formData.append('fullName', fullName.trim());
      if (studentIdFile) {
        formData.append('studentId', studentIdFile);
      }
      await submitRegistrationRequest(formData);
      setSuccess(true);
    } catch (err) {
      setError(extractErrorMessage(err, 'Kayıt talebi gönderilemedi.'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <section className="card fade-in-up" style={{ maxWidth: 480, margin: '3rem auto', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
        <h2>Kayıt talebiniz alındı!</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.75rem', lineHeight: 1.7 }}>
          Talebiniz yönetici tarafından incelenecektir. Onaylandıktan sonra belirlediğiniz kullanıcı adı ve şifre ile giriş yapabilirsiniz.
        </p>
        <a href="/login" className="button" style={{ marginTop: '1.5rem', display: 'inline-block' }}>
          Giriş sayfasına dön
        </a>
      </section>
    );
  }

  return (
    <section className="card fade-in-up" style={{ maxWidth: 480, margin: '3rem auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <span className="badge badge-glow" style={{ marginBottom: '0.75rem', display: 'inline-block' }}>📝</span>
        <h1>Kayıt Talebi</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Hesap oluşturmak için aşağıdaki bilgileri doldurun. Talebiniz yönetici onayı ile aktifleştirilecektir.
        </p>
      </div>

      {error && <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</p>}

      <form onSubmit={handleSubmit} className="form-grid">
        <div className="form-group">
          <label htmlFor="fullName">Ad Soyad</label>
          <input
            id="fullName" className="input" required placeholder="Adınız Soyadınız"
            value={fullName} onChange={e => setFullName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="desiredUsername">Kullanıcı Adı</label>
          <input
            id="desiredUsername" className="input" required placeholder="Kullanıcı adınız"
            value={desiredUsername} onChange={e => setDesiredUsername(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="reg-password">Şifre</label>
          <input
            id="reg-password" className="input" type="password" required minLength={8} placeholder="Min 8 karakter"
            value={password} onChange={e => setPassword(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="passwordConfirm">Şifre Tekrarı</label>
          <input
            id="passwordConfirm" className="input" type="password" required minLength={8} placeholder="Şifrenizi tekrarlayın"
            value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="studentIdFile">Öğrenci Kimliği (isteğe bağlı)</label>
          <input
            id="studentIdFile" type="file" accept="image/*"
            onChange={e => setStudentIdFile(e.target.files?.[0] ?? null)}
          />
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Onay sürecini hızlandırmak için öğrenci kimliğinizin fotoğrafını yükleyebilirsiniz.
          </p>
        </div>

        <button className="button" type="submit" disabled={loading}>
          {loading ? 'Gönderiliyor...' : 'Kayıt Talebi Gönder'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
        Zaten hesabınız var mı? <a href="/login" style={{ color: 'var(--primary)' }}>Giriş Yap</a>
      </p>
    </section>
  );
};
