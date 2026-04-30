import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { submitRegistrationRequest } from '../api/profile';
import { useAuth } from '../hooks/useAuth';
import { extractErrorMessage } from '../utils/errorMessage';

export const RegisterRequestPage: React.FC = () => {
  const { user } = useAuth();
  
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [studentIdFile, setStudentIdFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [desiredUsername, setDesiredUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleNext = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (step === 1) {
      if (!fullName.trim() || !studentNumber.trim()) {
        setError('Ad soyad ve okul numarası zorunludur.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!studentIdFile) {
        setError('Lütfen öğrenci kimliğinizin fotoğrafını yükleyin.');
        return;
      }
      setStep(3);
    }
  };

  const handlePrev = () => {
    setError(null);
    setStep(s => Math.max(1, s - 1));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setStudentIdFile(file);
      const reader = new FileReader();
      reader.onload = (event) => setPreview(event.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setStudentIdFile(null);
      setPreview(null);
    }
  };

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
      formData.append('studentNumber', studentNumber.trim());
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
          Aramıza katılmak için aşağıdaki adımları tamamlayın.
        </p>
      </div>

      <div className="progress-steps" style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
        {['Kişisel', 'Kimlik', 'Hesap'].map((label, index) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', opacity: step === index + 1 ? 1 : 0.4 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '1.5rem', height: '1.5rem', borderRadius: '50%', fontSize: '0.75rem', fontWeight: 700,
              background: step === index + 1 ? 'var(--primary)' : 'rgba(15,23,42,0.08)',
              color: step === index + 1 ? '#fff' : 'var(--text-muted)'
            }}>
              {index + 1}
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: step === index + 1 ? 600 : 400 }}>{label}</span>
            {index < 2 && <span style={{ margin: '0 0.25rem', color: 'var(--text-muted)' }}>→</span>}
          </div>
        ))}
      </div>

      {error && <p style={{ color: 'var(--danger)', marginBottom: '1rem', padding: '0.75rem', background: 'rgba(239,68,68,0.1)', borderRadius: '8px' }}>{error}</p>}

      <form onSubmit={step === 3 ? handleSubmit : handleNext} className="form-grid">
        {step === 1 && (
          <div className="fade-in-up">
            <div className="form-group">
              <label htmlFor="fullName">Ad Soyad</label>
              <input
                id="fullName" className="input" required placeholder="Kimlikteki adınız ve soyadınız"
                value={fullName} onChange={e => setFullName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="studentNumber">Okul Numarası</label>
              <input
                id="studentNumber" className="input" required placeholder="Öğrenci numaranız" type="number"
                value={studentNumber} onChange={e => setStudentNumber(e.target.value)}
              />
            </div>
            <button className="button" type="submit" style={{ width: '100%', marginTop: '0.5rem' }}>
              Sonraki Adım →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="fade-in-up">
            <div className="form-group">
              <label htmlFor="studentIdFile">Öğrenci Kimliği Fotoğrafı</label>
              <div style={{
                border: '2px dashed rgba(15,23,42,0.15)', borderRadius: '12px', padding: '2rem', textAlign: 'center',
                background: 'rgba(15,23,42,0.02)', cursor: 'pointer', transition: 'all 0.2s ease',
                position: 'relative'
              }}>
                <input
                  id="studentIdFile" type="file" accept="image/*" required onChange={handleFileChange}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                />
                {!preview ? (
                  <div>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📸</div>
                    <p style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 500 }}>Fotoğraf yüklemek için tıklayın</p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Maksimum 20MB, JPG/PNG</p>
                  </div>
                ) : (
                  <img src={preview} alt="Kimlik Önizleme" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px' }} />
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button className="button ghost" type="button" onClick={handlePrev}>← Geri</button>
              <button className="button" type="submit" style={{ flex: 1 }}>Sonraki Adım →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="fade-in-up">
            <div className="form-group">
              <label htmlFor="desiredUsername">Kullanıcı Adı</label>
              <input
                id="desiredUsername" className="input" required placeholder="kullaniciadiniz"
                value={desiredUsername} onChange={e => setDesiredUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
              />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Sadece harf, rakam ve altçizgi.</p>
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
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button className="button ghost" type="button" onClick={handlePrev}>← Geri</button>
              <button className="button" type="submit" disabled={loading} style={{ flex: 1 }}>
                {loading ? 'Gönderiliyor...' : 'Kayıt Talebi Gönder'}
              </button>
            </div>
          </div>
        )}
      </form>

      <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
        Zaten hesabınız var mı? <a href="/login" style={{ color: 'var(--primary)', fontWeight: 500 }}>Giriş Yap</a>
      </p>
    </section>
  );
};
