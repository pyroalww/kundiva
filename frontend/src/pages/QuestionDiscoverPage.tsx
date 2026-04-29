import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { fetchPublicQuestions } from '../api/questions';
import { LoadingOverlay } from '../components/LoadingOverlay';
import type { QuestionListItem } from '../types';
import { extractErrorMessage } from '../utils/errorMessage';

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Beklemede',
    IN_PROGRESS: 'Çözülüyor',
    ANSWERED: 'Çözüldü',
    FLAGGED: 'İnceleniyor'
};

export const QuestionDiscoverPage: React.FC = () => {
    const [questions, setQuestions] = useState<QuestionListItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const pageSize = 20;

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const data = await fetchPublicQuestions({
                query: query || undefined,
                skip: page * pageSize,
                take: pageSize
            });
            setQuestions(data.items);
            setTotal(data.total);
            setError(null);
        } catch (err) {
            setError(extractErrorMessage(err, 'Sorular yüklenemedi.'));
        } finally {
            setLoading(false);
        }
    }, [query, page]);

    useEffect(() => {
        void load();
    }, [load]);

    return (
        <section>
            <header className="card fade-in-up" style={{ textAlign: 'center' }}>
                <span className="badge badge-glow">🔍 Soru Havuzu</span>
                <h1 style={{ marginTop: '1rem' }}>Soruları keşfet</h1>
                <p style={{ color: 'var(--text-muted)' }}>
                    Platformdaki tüm soruları keşfedin ve çözümlerden öğrenin.
                </p>
            </header>

            <div className="card fade-in-up" style={{ marginTop: '1.5rem' }}>
                <input
                    className="input"
                    type="search"
                    placeholder="Soru ara..."
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setPage(0);
                    }}
                />
            </div>

            {loading && <LoadingOverlay subtle message="Yükleniyor..." />}
            {error && <p style={{ color: 'var(--danger)', marginTop: '1rem' }}>{error}</p>}

            {!loading && questions.length === 0 && (
                <div className="card fade-in-up" style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                    <p>Henüz soru bulunamadı.</p>
                </div>
            )}

            <div style={{ marginTop: '1.5rem' }}>
                {questions.map((q, i) => (
                    <Link
                        key={q.id}
                        to={`/questions/${q.id}`}
                        className="card hoverable fade-in-up"
                        style={{
                            display: 'block',
                            textDecoration: 'none',
                            color: 'inherit',
                            marginBottom: '0.75rem',
                            animationDelay: `${i * 0.03}s`
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h3 style={{ marginBottom: '0.35rem' }}>
                                    {q.title}
                                    {q.useKundivaAi && (
                                        <span className="badge" style={{ marginLeft: '0.5rem', background: 'rgba(139,92,246,0.15)', color: '#7c3aed' }}>
                                            KundivaAI ✓
                                        </span>
                                    )}
                                </h3>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    <span>{q.subjectName}</span>
                                    <span>•</span>
                                    <span>{q.course}</span>
                                    <span>•</span>
                                    <span>{q.educationLevel}</span>
                                </div>
                            </div>
                            <span className={`status-chip ${q.status ?? 'PENDING'}`}>
                                {STATUS_LABELS[q.status ?? 'PENDING']}
                            </span>
                        </div>
                    </Link>
                ))}
            </div>

            {total > pageSize && (
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.5rem' }}>
                    <button className="button ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                        ← Önceki
                    </button>
                    <span style={{ alignSelf: 'center', color: 'var(--text-muted)' }}>
                        {page + 1} / {Math.ceil(total / pageSize)}
                    </span>
                    <button
                        className="button ghost"
                        disabled={(page + 1) * pageSize >= total}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        Sonraki →
                    </button>
                </div>
            )}
        </section>
    );
};
