import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { apiClient } from '../api/client';
import { fetchPublicQuestions } from '../api/questions';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { QuestionCard } from '../components/QuestionCard';
import { usePageTitle } from '../hooks/usePageTitle';
import type { QuestionFilters, QuestionListItem } from '../types';
import { extractErrorMessage } from '../utils/errorMessage';

/* ---------- real-time platform stats ---------- */
type PlatformStats = {
  students: number;
  teachers: number;
  totalQuestions: number;
  answeredQuestions: number;
  totalSolutions: number;
};

const FEATURE_CARDS = [
  {
    icon: '⚡',
    title: 'Hızlı çözüm',
    description: 'Sorunu yükle, KundivaAI adım adım anlaşılır bir çözüm hazırlasın.'
  },
  {
    icon: '👨‍🏫',
    title: 'Öğretmen desteği',
    description: 'Gönüllü öğretmenler çözümü kontrol eder, videolu anlatımlar ekler.'
  },
  {
    icon: '🔄',
    title: 'Takip sorusu',
    description: 'Çözüm yetmediyse hemen takip sorusu sor, diyalog devam etsin.'
  },
  {
    icon: '🧠',
    title: 'Benzer soru üretimi',
    description: 'Her çözüm sonrası AI ile yeni pratik sorusu üret, konuyu pekiştir.'
  }
];

const PROCESS_STEPS = [
  { num: '01', title: 'Soruyu yükle', desc: 'Metin, fotoğraf veya video ile sorunu sisteme ekle.' },
  { num: '02', title: 'AI çözümü', desc: 'KundivaAI saniyeler içinde anlaşılır bir çözüm hazırlar.' },
  { num: '03', title: 'Öğretmen onayı', desc: 'Öğretmenler çözümü doğrular, gerekirse detaylandırır.' },
  { num: '04', title: 'Pekiştir & paylaş', desc: 'Benzer sorularla pratik yap, arkadaşlarınla tartış.' }
];

export const HomePage: React.FC = () => {
  usePageTitle('Anasayfa');
  const [questions, setQuestions] = useState<QuestionListItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const navigate = useNavigate();

  /* Fetch real stats from the public API */
  useEffect(() => {
    apiClient
      .get<PlatformStats>('/public/stats')
      .then((res) => setStats(res.data))
      .catch(() => {
        /* stats are optional, fail silently */
      });
  }, []);

  const loadQuestions = useCallback(async (queryValue: string) => {
    try {
      setLoading(true);
      const result = await fetchPublicQuestions({
        query: queryValue || undefined,
        take: 6
      });
      setQuestions(result.items);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err, 'Soruları yüklerken bir hata oluştu.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQuestions('');
  }, [loadQuestions]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = search.trim();
    if (!trimmed) {
      void loadQuestions('');
      return;
    }
    navigate(`/questions/discover?q=${encodeURIComponent(trimmed)}`);
  };

  const answeredPct =
    stats && stats.totalQuestions > 0
      ? Math.round((stats.answeredQuestions / stats.totalQuestions) * 100)
      : 0;

  return (
    <section className="home">
      {/* ──── HERO ──── */}
      <div className="hero">
        <div className="hero-copy fade-in-up">
          <span className="badge badge-glow">Kundiva · TÜBİTAK 4006</span>
          <h1>
            Sorunu paylaş,{' '}
            <span className="highlight">KundivaAI</span> ve öğretmenler birlikte çözsün.
          </h1>
          <p className="hero-subtitle">
            Şeyh İsa Anadolu Lisesi tarafından geliştirilen eğitim platformu. Öğrenciler sorularını yükler,
            KundivaAI hızla çözüm önerir, gönüllü öğretmenler süreci tamamlar.
          </p>
          <div className="hero-actions">
            <Link to="/student/ask" className="button">
              Soru Gönder
            </Link>
            <Link to="/questions/discover" className="button secondary">
              Soru Havuzunu İncele
            </Link>
          </div>
        </div>

        {/* Right panel – real stats */}
        <div className="hero-panel fade-in-up" style={{ animationDelay: '0.12s' }}>
          <h3 className="hero-panel-title">Platform Verileri</h3>
          <div className="hero-stats">
            <div className="stat-card">
              <span className="stat-value">{stats?.students ?? '–'}</span>
              <span className="stat-label">Öğrenci</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{stats?.teachers ?? '–'}</span>
              <span className="stat-label">Öğretmen</span>
            </div>
            <div className="stat-card stat-card--accent">
              <span className="stat-value">{stats?.totalQuestions ?? '–'}</span>
              <span className="stat-label">Toplam Soru</span>
            </div>
            <div className="stat-card stat-card--success">
              <span className="stat-value">{stats ? `%${answeredPct}` : '–'}</span>
              <span className="stat-label">Çözülme Oranı</span>
            </div>
          </div>

          {stats && stats.totalSolutions > 0 && (
            <p className="hero-panel-note">
              Öğrenciler toplamda <strong>{stats.totalSolutions}</strong> çözüm paylaştı.
            </p>
          )}
        </div>
      </div>

      {/* ──── HOW IT WORKS ──── */}
      <section className="home-section fade-in-up" style={{ animationDelay: '0.16s' }}>
        <header className="home-section-header">
          <div>
            <span className="section-badge">Adımlar</span>
            <h2>Nasıl çalışır?</h2>
          </div>
        </header>
        <div className="steps-grid">
          {PROCESS_STEPS.map((step) => (
            <div key={step.num} className="step-card">
              <span className="step-num">{step.num}</span>
              <div>
                <strong>{step.title}</strong>
                <p>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ──── FEATURES ──── */}
      <section className="home-section fade-in-up" style={{ animationDelay: '0.2s' }}>
        <header className="home-section-header">
          <div>
            <span className="section-badge">Özellikler</span>
            <h2>Neden Kundiva?</h2>
            <p className="section-desc">Başından sonuna kadar anlaşılır, güvenli ve hızlı bir öğrenme deneyimi.</p>
          </div>
        </header>
        <div className="features-grid">
          {FEATURE_CARDS.map((card) => (
            <article key={card.title} className="feature-card">
              <span className="feature-icon">{card.icon}</span>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ──── RECENT QUESTIONS ──── */}
      <section className="home-section fade-in-up" style={{ animationDelay: '0.24s' }}>
        <header className="home-section-header home-section-header--row">
          <div>
            <span className="section-badge">Keşfet</span>
            <h2>Son sorular</h2>
          </div>
          <form onSubmit={handleSearch} className="feed-search">
            <input
              className="input"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Soru ara…"
            />
            <button className="button secondary" type="submit" disabled={loading}>
              Ara
            </button>
          </form>
        </header>

        {loading && <LoadingOverlay subtle message="Sorular yükleniyor..." />}
        {error && <p className="error-text">{error}</p>}
        {!loading && questions.length === 0 && (
          <div className="empty-state">
            <p>Henüz eşleşen soru bulunamadı. İlk soruyu sen sor!</p>
          </div>
        )}

        <div className="question-grid">
          {questions.map((question) => (
            <QuestionCard key={question.id} question={question} />
          ))}
        </div>

        <div className="home-section-footer">
          <Link to="/questions/discover" className="button ghost">
            Tüm soruları görüntüle →
          </Link>
        </div>
      </section>
    </section>
  );
};
