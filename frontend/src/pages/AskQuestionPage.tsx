import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { createQuestion } from '../api/questions';
import { useAuth } from '../hooks/useAuth';
import { extractErrorMessage } from '../utils/errorMessage';

const COURSES = [
  'Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Türkçe', 'Edebiyat',
  'Tarih', 'Coğrafya', 'Felsefe', 'İngilizce', 'Almanca', 'Fransızca',
  'Din Kültürü', 'Bilgisayar', 'Geometri', 'İstatistik', 'Muhasebe',
  'Hukuk', 'Sosyoloji', 'Psikoloji', 'Diğer'
];

const EDUCATION_LEVELS = [
  'İlkokul', 'Ortaokul', 'Lise', 'Üniversite', 'TYT', 'AYT', 'KPSS',
  'DGS', 'YDS', 'ALES', 'Diğer'
];

const CATEGORIES = [
  'GENEL', 'SINAV', 'ÖDEV', 'PROJE', 'ARAŞTIRMA', 'DİĞER'
];

type FormValues = {
  title: string;
  firstName: string;
  lastName: string;
  studentNumber: string;
  course: string;
  subjectArea: string;
  subjectName: string;
  category: string;
  educationLevel: string;
  questionText: string;
  useKundivaAi: boolean;
};

export const AskQuestionPage: React.FC = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      studentNumber: user?.studentNumber ?? '',
      useKundivaAi: false
    }
  });

  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const useKundivaAi = watch('useKundivaAi');

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const f = event.target.files?.[0] ?? null;
    setFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }, []);

  const onSubmit = async (values: FormValues) => {
    try {
      setLoading(true);
      setError(null);
      const question = await createQuestion({
        payload: {
          title: values.title.trim(),
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          studentNumber: values.studentNumber.trim(),
          course: values.course,
          subjectArea: values.subjectArea.trim(),
          subjectName: values.subjectName.trim(),
          category: values.category,
          educationLevel: values.educationLevel,
          questionText: values.questionText.trim() || undefined,
          solverType: 'TEACHER',
          useKundivaAi: values.useKundivaAi
        },
        file
      });
      nav(`/questions/${question.id}`);
    } catch (err) {
      setError(extractErrorMessage(err, 'Soru gönderilemedi.'));
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  const renderStep0 = () => (
    <div className="fade-in-up">
      <h2>Kişisel bilgiler</h2>
      <div className="form-grid columns-2">
        <div className="form-group">
          <label htmlFor="firstName">Ad</label>
          <input id="firstName" className="input" required {...register('firstName', { required: true })} />
        </div>
        <div className="form-group">
          <label htmlFor="lastName">Soyad</label>
          <input id="lastName" className="input" required {...register('lastName', { required: true })} />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="studentNumber">Öğrenci numarası</label>
        <input id="studentNumber" className="input" required {...register('studentNumber', { required: true })} />
      </div>
      <button className="button" type="button" onClick={nextStep}>
        Devam et →
      </button>
    </div>
  );

  const renderStep1 = () => (
    <div className="fade-in-up">
      <h2>Soru bilgileri</h2>
      <div className="form-grid columns-2">
        <div className="form-group">
          <label htmlFor="course">Ders</label>
          <select id="course" className="input" required {...register('course', { required: true })}>
            <option value="">Seçiniz</option>
            {COURSES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="educationLevel">Eğitim düzeyi</label>
          <select id="educationLevel" className="input" required {...register('educationLevel', { required: true })}>
            <option value="">Seçiniz</option>
            {EDUCATION_LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-grid columns-2">
        <div className="form-group">
          <label htmlFor="subjectArea">Konu alanı</label>
          <input id="subjectArea" className="input" required placeholder="Örn: Diferansiyel" {...register('subjectArea', { required: true })} />
        </div>
        <div className="form-group">
          <label htmlFor="subjectName">Alt konu</label>
          <input id="subjectName" className="input" required placeholder="Örn: Türev uygulamaları" {...register('subjectName', { required: true })} />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="category">Kategori</label>
        <select id="category" className="input" {...register('category')}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button className="button ghost" type="button" onClick={prevStep}>
          ← Geri
        </button>
        <button className="button" type="button" onClick={nextStep}>
          Devam et →
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="fade-in-up">
      <h2>Sorunuz</h2>
      <div className="form-group">
        <label htmlFor="title">Soru Başlığı</label>
        <input 
          id="title" 
          className="input" 
          required 
          placeholder="Örn: Newton'un İkinci Yasası Hakkında Sürtünme Problemi" 
          {...register('title', { required: true })} 
        />
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Lütfen sorunuzun ne hakkında olduğunu kısaca özetleyin. "Acil yardım", "Bakar mısınız" gibi başlıklar kullanmayın.
        </p>
      </div>
      <div className="form-group">
        <label htmlFor="questionText">Soru Metni</label>
        <textarea
          id="questionText"
          className="input"
          rows={6}
          placeholder="Sorunuzu detaylı bir şekilde yazınız..."
          {...register('questionText')}
        />
      </div>
      <div className="form-group">
        <label htmlFor="questionImage">Veya fotoğraf yükleyin</label>
        <input
          id="questionImage"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
        />
        {preview && (
          <div style={{ marginTop: '0.75rem' }}>
            <img
              src={preview}
              alt="Soru görseli"
              style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '12px', border: '1px solid rgba(15,23,42,0.08)' }}
            />
          </div>
        )}
      </div>

      {/* KundivaAI solution checkbox */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(59,130,246,0.06))',
        border: '1px solid rgba(139,92,246,0.15)',
        marginBottom: '1rem'
      }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            style={{ marginTop: '0.25rem' }}
            {...register('useKundivaAi')}
          />
          <div>
            <strong style={{ color: 'var(--primary)' }}>🤖 KundivaAI Çözüm</strong>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Yapay zeka ile otomatik çözüm al. Her doğru çözümünüz size 1 AI kredisi kazandırır.
            </p>
            {user && (
              <p style={{ fontSize: '0.8rem', color: useKundivaAi ? 'var(--primary)' : 'var(--text-muted)', marginTop: '0.25rem' }}>
                Mevcut krediniz: <strong>{user.aiCredits ?? 0}</strong>
                {useKundivaAi && (user.aiCredits ?? 0) <= 0 && (
                  <span style={{ color: 'var(--danger)', marginLeft: '0.5rem' }}>
                    ⚠ Yeterli krediniz yok. Doğru çözüm yaparak kredi kazanabilirsiniz.
                  </span>
                )}
              </p>
            )}
          </div>
        </label>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button className="button ghost" type="button" onClick={prevStep}>
          ← Geri
        </button>
        <button className="button" type="submit" disabled={loading}>
          {loading ? 'Gönderiliyor...' : 'Soruyu gönder'}
        </button>
      </div>
    </div>
  );

  return (
    <section>
      <header className="card fade-in-up" style={{ textAlign: 'center' }}>
        <span className="badge badge-glow" style={{ marginBottom: '0.75rem', display: 'inline-block' }}>❓</span>
        <h1>Yeni soru sor</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Sorunuzu detaylı bir şekilde paylaşın. Öğretmenler ve topluluk çözüm sunacaktır.
        </p>
      </header>

      {error && <p style={{ color: 'var(--danger)', marginTop: '1rem' }}>{error}</p>}

      <div className="card fade-in-up" style={{ marginTop: '1.5rem' }}>
        <div
          className="progress-steps"
          style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}
        >
          {['Kişisel', 'Ders bilgileri', 'Soru'].map((label, index) => (
            <div
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                opacity: step === index ? 1 : 0.4
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '1.5rem',
                  height: '1.5rem',
                  borderRadius: '50%',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: step === index ? 'var(--primary)' : 'rgba(15,23,42,0.08)',
                  color: step === index ? '#fff' : 'var(--text-muted)'
                }}
              >
                {index + 1}
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: step === index ? 600 : 400 }}>{label}</span>
              {index < 2 && <span style={{ margin: '0 0.25rem', color: 'var(--text-muted)' }}>→</span>}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {step === 0 && renderStep0()}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
        </form>
      </div>
    </section>
  );
};
