import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { completeProfile } from '../api/auth';
import { useAuth } from '../hooks/useAuth';
import { extractErrorMessage } from '../utils/errorMessage';

type FormValues = {
    firstName: string;
    lastName: string;
    email: string;
    studentNumber: string;
    subjectsText: string;
    educationLevelsText: string;
};

const toList = (value?: string) =>
    value
        ? value
            .split(',')
            .map((entry) => entry.trim())
            .filter(Boolean)
        : [];

export const CompleteProfilePage: React.FC = () => {
    const { user, login: authLogin } = useAuth();
    const nav = useNavigate();
    const { register, handleSubmit } = useForm<FormValues>();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const onSubmit = async (values: FormValues) => {
        try {
            setLoading(true);
            const result = await completeProfile({
                firstName: values.firstName.trim(),
                lastName: values.lastName.trim(),
                email: values.email?.trim() || undefined,
                studentNumber: values.studentNumber?.trim() || undefined,
                subjects: user?.role === 'TEACHER' ? toList(values.subjectsText) : undefined,
                educationLevels: user?.role === 'TEACHER' ? toList(values.educationLevelsText) : undefined
            });
            authLogin(result);
            nav('/');
        } catch (err) {
            setError(extractErrorMessage(err, 'Profil tamamlanamadı.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="card" style={{ maxWidth: '640px', margin: '3rem auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <span className="badge badge-glow">Hoş geldin!</span>
                <h1 style={{ marginTop: '1rem' }}>Profilini tamamla</h1>
                <p style={{ color: 'var(--text-muted)' }}>
                    İlk girişin için profilini tamamlaman gerekiyor. Bu bilgiler hesabına bağlanacak.
                </p>
            </div>
            {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

            <form onSubmit={handleSubmit(onSubmit)} className="form-grid">
                <div className="form-grid columns-2">
                    <div className="form-group">
                        <label htmlFor="firstName">Ad</label>
                        <input
                            id="firstName"
                            className="input"
                            required
                            placeholder="Adınız"
                            {...register('firstName')}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="lastName">Soyad</label>
                        <input
                            id="lastName"
                            className="input"
                            required
                            placeholder="Soyadınız"
                            {...register('lastName')}
                        />
                    </div>
                </div>
                <div className="form-group">
                    <label htmlFor="email">E-posta (opsiyonel)</label>
                    <input
                        id="email"
                        className="input"
                        type="email"
                        placeholder="ornek@email.com"
                        {...register('email')}
                    />
                </div>
                {user?.role === 'STUDENT' && (
                    <div className="form-group fade-in-up">
                        <label htmlFor="studentNumber">Öğrenci numarası (opsiyonel)</label>
                        <input
                            id="studentNumber"
                            className="input"
                            placeholder="Öğrenci numaranız"
                            {...register('studentNumber')}
                        />
                    </div>
                )}
                {user?.role === 'TEACHER' && (
                    <div className="fade-in-up">
                        <div className="form-group">
                            <label htmlFor="subjectsText">Uzmanlık alanlarınız</label>
                            <input
                                id="subjectsText"
                                className="input"
                                placeholder="Matematik, Fizik, Türkçe"
                                {...register('subjectsText')}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="educationLevelsText">Destek verebildiğiniz düzeyler</label>
                            <input
                                id="educationLevelsText"
                                className="input"
                                placeholder="Lise, TYT, KPSS"
                                {...register('educationLevelsText')}
                            />
                        </div>
                    </div>
                )}
                <button className="button" type="submit" disabled={loading}>
                    {loading ? 'Kaydediliyor...' : 'Profili tamamla'}
                </button>
            </form>
        </section>
    );
};
