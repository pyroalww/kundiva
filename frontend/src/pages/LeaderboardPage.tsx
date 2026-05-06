import { useCallback, useEffect, useState } from 'react';

import { fetchLeaderboard } from '../api/questions';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { usePageTitle } from '../hooks/usePageTitle';
import type { LeaderboardEntry } from '../types';
import { extractErrorMessage } from '../utils/errorMessage';

const PERIODS = [
    { key: 'daily' as const, label: 'Bugün' },
    { key: 'weekly' as const, label: 'Bu Hafta' },
    { key: 'monthly' as const, label: 'Bu Ay' }
];

const MEDALS = ['🥇', '🥈', '🥉'];

export const LeaderboardPage: React.FC = () => {
    usePageTitle('Liderlik Tablosu');
    const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (p: 'daily' | 'weekly' | 'monthly') => {
        try {
            setLoading(true);
            const data = await fetchLeaderboard(p);
            setEntries(data);
            setError(null);
        } catch (err) {
            setError(extractErrorMessage(err, 'Liderlik tablosu yüklenemedi.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load(period);
    }, [period, load]);

    return (
        <section>
            <header className="card fade-in-up" style={{ textAlign: 'center' }}>
                <span className="badge badge-glow">🏆 Liderlik Tablosu</span>
                <h1 style={{ marginTop: '1rem' }}>En çok puan kazanan öğrenciler</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    Doğru çözümler yaparak puan kazan, yapay zeka kredisi kazan ve liderlik tablosunda yüksel!
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {PERIODS.map((p) => (
                        <button
                            key={p.key}
                            className={`button ${period === p.key ? '' : 'secondary'}`}
                            type="button"
                            onClick={() => setPeriod(p.key)}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </header>

            {loading && <LoadingOverlay subtle message="Yükleniyor..." />}
            {error && <p style={{ color: 'var(--danger)', marginTop: '1rem' }}>{error}</p>}

            {!loading && entries.length === 0 && (
                <div className="card fade-in-up" style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                    <p>Bu dönem için henüz sıralama yok. İlk doğru çözümü yaparak liderliği başlat!</p>
                </div>
            )}

            {!loading && entries.length > 0 && (
                <div className="leaderboard-list fade-in-up" style={{ marginTop: '1.5rem' }}>
                    {entries.map((entry, index) => (
                        <div
                            key={entry.userId}
                            className="card"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                marginBottom: '0.75rem',
                                animationDelay: `${index * 0.03}s`,
                                borderLeft: index < 3 ? '4px solid var(--primary)' : undefined
                            }}
                        >
                            <div
                                style={{
                                    width: '3rem',
                                    height: '3rem',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: index < 3 ? 'var(--primary)' : 'rgba(15,23,42,0.06)',
                                    color: index < 3 ? '#fff' : 'var(--text-muted)',
                                    fontWeight: 700,
                                    fontSize: index < 3 ? '1.4rem' : '1rem',
                                    flexShrink: 0
                                }}
                            >
                                {index < 3 ? MEDALS[index] : index + 1}
                            </div>
                            <div style={{ flex: 1 }}>
                                <strong>{entry.firstName} {entry.lastName}</strong>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    {entry.correctSolutions} doğru çözüm · Toplam {entry.totalPoints} puan
                                </div>
                            </div>
                            <div
                                style={{
                                    fontWeight: 700,
                                    fontSize: '1.25rem',
                                    color: 'var(--primary)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-end'
                                }}
                            >
                                <span>{entry.periodPoints}</span>
                                <span style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                                    puan
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
};
