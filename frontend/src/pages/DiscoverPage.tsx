import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { fetchPublicQuestions } from '../api/questions';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { QuestionFilterBar } from '../components/QuestionFilterBar';
import { QuestionCard } from '../components/QuestionCard';
import type { QuestionFilters, QuestionListItem } from '../types';
import { extractErrorMessage } from '../utils/errorMessage';

const useQuery = () => new URLSearchParams(useLocation().search);

export const DiscoverPage: React.FC = () => {
  const query = useQuery();
  const [questions, setQuestions] = useState<QuestionListItem[]>([]);
  const [search, setSearch] = useState(query.get('q') ?? '');
  const [activeQuery, setActiveQuery] = useState(query.get('q') ?? '');
  const [filters, setFilters] = useState<QuestionFilters>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQuestions = useCallback(
    async (queryValue: string, filterValue: QuestionFilters) => {
      try {
        setLoading(true);
        const result = await fetchPublicQuestions({ query: queryValue || undefined, filters: filterValue });
        setQuestions(result.items);
        setError(null);
      } catch (err) {
        setError(extractErrorMessage(err, 'Sorular yüklenemedi.'));
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadQuestions(activeQuery, filters);
  }, [activeQuery, filters, loadQuestions]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActiveQuery(search.trim());
  };

  return (
    <section className="card">
      <header style={{ marginBottom: '1.5rem' }}>
        <h1>Soru Havuzu</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Daha önce sorulmuş ve Kundiva topluluğu tarafından cevaplanmış sorulara göz at.
        </p>
        <form
          onSubmit={handleSearch}
          style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}
        >
          <input
            className="input"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Başlık veya içerikte ara"
          />
          <button className="button secondary" type="submit" disabled={loading}>
            Ara
          </button>
        </form>
      </header>
      <QuestionFilterBar value={filters} onChange={setFilters} />
      {loading && <LoadingOverlay subtle message="Sorular yükleniyor..." />}
      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
      {!loading && questions.length === 0 && <p>Henüz eşleşen soru bulunamadı.</p>}
      <div className="question-grid">
        {questions.map((question) => (
          <QuestionCard key={question.id} question={question} />
        ))}
      </div>
    </section>
  );
};
