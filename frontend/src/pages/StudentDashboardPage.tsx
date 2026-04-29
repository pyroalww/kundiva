import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { fetchStudentQuestions } from '../api/questions';
import type { QuestionDetail } from '../types';
import { extractErrorMessage } from '../utils/errorMessage';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Beklemede',
  IN_PROGRESS: 'Üzerinde Çalışılıyor',
  ANSWERED: 'Çözüldü',
  FLAGGED: 'İnceleme Bekliyor'
};

export const StudentDashboardPage: React.FC = () => {
  const [questions, setQuestions] = useState<QuestionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchStudentQuestions();
        setQuestions(data);
        setError(null);
      } catch (err) {
        setError(extractErrorMessage(err, 'Sorularınız yüklenemedi.'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <section>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1>Sorularım</h1>
        <Link className="button" to="/student/ask">
          Yeni soru sor
        </Link>
      </header>
      {loading && <p>Yükleniyor...</p>}
      {error && <p style={{ color: '#b91c1c' }}>{error}</p>}
      {!loading && questions.length === 0 && (
        <p>Henüz soru göndermediniz. Hadi ilk sorunuzu birlikte çözelim.</p>
      )}
      {questions.map((question) => {
        const status = question.status ?? 'PENDING';
        return (
          <article key={question.id} className="card">
            <h3>{question.title}</h3>
            <p>
              Durum:{' '}
              <span className={`status-chip ${status}`}>
                {STATUS_LABELS[status] ?? status}
              </span>
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Link className="button" to={`/questions/${question.id}`}>
                Diyaloğu Gör
              </Link>
              {status === 'ANSWERED' && (
                <Link className="button ghost" to={`/questions/${question.id}`}>
                  Benzer soru üret
                </Link>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
};
