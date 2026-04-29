import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { fetchQuestionLibrary } from '../api/questions';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { useAuth } from '../hooks/useAuth';
import type { QuestionListItem } from '../types';
import { extractErrorMessage } from '../utils/errorMessage';

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Beklemede',
    IN_PROGRESS: 'Çözülüyor',
    ANSWERED: 'Çözüldü',
    FLAGGED: 'İnceleniyor'
};

const STATUS_FILTERS = [
    { key: '', label: 'Tümü' },
    { key: 'PENDING', label: 'Beklemede' },
    { key: 'IN_PROGRESS', label: 'Çözülüyor' },
    { key: 'ANSWERED', label: 'Çözüldü' }
];

export const QuestionLibraryPage: React.FC = () => {
    const { user } = useAuth();
    const [questions, setQuestions] = useState<QuestionListItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const pageSize = 20;

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const data = await fetchQuestionLibrary({
                query: query || undefined,
                skip: page * pageSize,
                take: pageSize,
                status: statusFilter || undefined
            });
            setQuestions(data.items);
            setTotal(data.total);
            setError(null);
        } catch (err) {
            setError(extractErrorMessage(err, 'Soru kütüphanesi yüklenemedi.'));
        } finally {
            setLoading(false);
        }
    }, [query, page, statusFilter]);

    useEffect(() => {
        void load();
    }, [load]);

    return (
        <section>
            <header className="card fade-in-up" style={{ textAlign: 'center' }}>
                <span className="badge badge-glow">📚 Soru Kütüphanesi</span>
                <h1 style={{ marginTop: '1rem' }}>Tüm sorular</h1>
                <p style={{ color: 'var(--text-muted)' }}>
                    Platform üzerindeki tüm soruları gör, çözüm yükle ve puan kazan.
                </p>
            </header>

            <div className="card fade-in-up" style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                        className="input"
                        style={{ flex: 1, minWidth: '200px' }}
                        type="search"
                        placeholder="Soru ara..."
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setPage(0);
                        }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {STATUS_FILTERS.map((f) => (
                            <button
                                key={f.key}
                                type="button"
                                className={`button ${statusFilter === f.key ? '' : 'ghost'}`}
                                style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem' }}
                                onClick={() => {
                                    setStatusFilter(f.key);
                                    setPage(0);
                                }}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
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
                                    {q.student && (
                                        <>
                                            <span>•</span>
                                            <span>{q.student.firstName} {q.student.lastName}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem', flexShrink: 0 }}>
                                <span className={`status-chip ${q.status ?? 'PENDING'}`}>
                                    {STATUS_LABELS[q.status ?? 'PENDING']}
                                </span>
                                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    <span>💬 {q._count?.answers ?? 0}</span>
                                    <span>📝 {q._count?.solutions ?? 0}</span>
                                </div>
                            </div>
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
