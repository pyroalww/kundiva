import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { submitRegistrationRequest } from '../api/profile';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { extractErrorMessage } from '../utils/errorMessage';
import { ResponsibilityAgreement } from '../components/ResponsibilityAgreement';

const STEP_LABELS = ['Kişisel Bilgi', 'Kimlik Doğrulama', 'Hesap Oluştur'];

export const RegisterRequestPage: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  usePageTitle('Kayıt Talebi');

  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [studentIdFile, setStudentIdFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [desiredUsername, setDesiredUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [agreementAccepted, setAgreementAccepted] = useState(false);

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
      <section className="card fade-in-up" style={{ maxWidth: 520, margin: '3rem auto', textAlign: 'center' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #10b981, #059669)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem', fontSize: '2rem',
          boxShadow: '0 12px 30px rgba(16,185,129,0.3)',
          animation: 'fade-slide-up 0.5s ease'
        }}>✅</div>
        <h2>Kayıt talebiniz alındı!</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.75rem', lineHeight: 1.7 }}>
          Talebiniz yönetici tarafından incelenecektir. Onaylandıktan sonra belirlediğiniz
          <strong style={{ color: 'var(--accent)' }}> {desiredUsername} </strong>
          kullanıcı adı ile giriş yapabilirsiniz.
        </p>
        <div style={{
          margin: '1.5rem auto', padding: '1rem', borderRadius: '12px',
          background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.1)',
          maxWidth: '300px'
        }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            📩 Onaylandığında bildirim alacaksınız.
          </p>
        </div>
        <a href="/login" className="button" style={{ marginTop: '1rem', display: 'inline-flex' }}>
          Giriş sayfasına dön
        </a>
      </section>
    );
  }

  return (
    <section className="card fade-in-up" style={{ maxWidth: 520, margin: '3rem auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '16px',
          background: 'linear-gradient(135deg, var(--accent), #7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1rem', fontSize: '1.5rem', color: '#fff',
          boxShadow: '0 8px 24px rgba(37,99,235,0.3)'
        }}>📝</div>
        <h1>Kayıt Talebi</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Aramıza katılmak için aşağıdaki adımları tamamlayın.
        </p>
      </div>

      {/* Enhanced step indicator */}
      <div className="register-step-indicator">
        <div className="register-step-line" />
        {STEP_LABELS.map((label, index) => {
          const stepNum = index + 1;
          const isDone = step > stepNum;
          const isActive = step === stepNum;
          return (
            <div key={label} className={`register-step-dot ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}>
              <div className="register-step-circle">
                {isDone ? '✓' : stepNum}
              </div>
              <span className="register-step-label">{label}</span>
            </div>
          );
        })}
      </div>

      {error && (
        <div style={{
          color: '#b91c1c', marginBottom: '1rem', padding: '0.75rem 1rem',
          background: 'rgba(239,68,68,0.08)', borderRadius: '12px',
          border: '1px solid rgba(239,68,68,0.15)', fontSize: '0.9rem',
          animation: 'fade-slide-up 0.3s ease'
        }}>
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={step === 3 ? handleSubmit : handleNext} className="form-grid">
        {step === 1 && (
          <div className="fade-in-up">
            <div className="form-group">
              <label htmlFor="fullName">👤 Ad Soyad</label>
              <input
                id="fullName" className="input" required placeholder="Kimlikteki adınız ve soyadınız"
                value={fullName} onChange={e => setFullName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="studentNumber">🎓 Okul Numarası</label>
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
              <label htmlFor="studentIdFile">📸 Öğrenci Kimliği Fotoğrafı</label>
              <div style={{
                border: '2px dashed rgba(37,99,235,0.2)', borderRadius: '16px', padding: '2rem', textAlign: 'center',
                background: 'rgba(37,99,235,0.02)', cursor: 'pointer', transition: 'all 0.3s ease',
                position: 'relative'
              }}>
                <input
                  id="studentIdFile" type="file" accept="image/*" required onChange={handleFileChange}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                />
                {!preview ? (
                  <div>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📸</div>
                    <p style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 600 }}>Fotoğraf yüklemek için tıklayın</p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Maksimum 20MB, JPG/PNG</p>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <img src={preview} alt="Kimlik Önizleme" style={{
                      maxWidth: '100%', maxHeight: '200px', borderRadius: '12px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
                    }} />
                    <div style={{
                      position: 'absolute', top: '0.5rem', right: '0.5rem',
                      background: 'rgba(16,185,129,0.9)', color: '#fff',
                      borderRadius: '50%', width: '28px', height: '28px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.8rem', fontWeight: 'bold'
                    }}>✓</div>
                  </div>
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
              <label htmlFor="desiredUsername">🔑 Kullanıcı Adı</label>
              <input
                id="desiredUsername" className="input" required placeholder="kullaniciadiniz"
                value={desiredUsername} onChange={e => setDesiredUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
              />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Sadece harf, rakam ve altçizgi.</p>
            </div>
            <div className="form-group">
              <label htmlFor="reg-password">🔒 Şifre</label>
              <input
                id="reg-password" className="input" type="password" required minLength={8} placeholder="Min 8 karakter"
                value={password} onChange={e => setPassword(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="passwordConfirm">🔒 Şifre Tekrarı</label>
              <input
                id="passwordConfirm" className="input" type="password" required minLength={8} placeholder="Şifrenizi tekrarlayın"
                value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)}
              />
              {password && passwordConfirm && (
                <p style={{
                  fontSize: '0.8rem', marginTop: '0.25rem',
                  color: password === passwordConfirm ? 'var(--success)' : 'var(--danger)'
                }}>
                  {password === passwordConfirm ? '✓ Şifreler eşleşiyor' : '✗ Şifreler eşleşmiyor'}
                </p>
              )}
            </div>

            <ResponsibilityAgreement checked={agreementAccepted} onChange={setAgreementAccepted} />

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button className="button ghost" type="button" onClick={handlePrev}>← Geri</button>
              <button className="button" type="submit" disabled={loading || !agreementAccepted} style={{ flex: 1 }}>
                {loading ? 'Gönderiliyor...' : '🚀 Kayıt Talebi Gönder'}
              </button>
            </div>
          </div>
        )}
      </form>

      <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
        Zaten hesabınız var mı? <a href="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Giriş Yap</a>
      </p>
    </section>
  );
};
