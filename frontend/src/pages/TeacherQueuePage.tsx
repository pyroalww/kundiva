import { FormEvent, useEffect, useState } from 'react';

import { fetchTeacherQueue, submitTeacherAnswer } from '../api/questions';
import { LoadingOverlay } from '../components/LoadingOverlay';
import type { MediaAttachment, QuestionDetail } from '../types';
import { extractErrorMessage } from '../utils/errorMessage';

const SOURCE_LABELS: Record<string, string> = {
  AI: 'Yapay Zeka Yanıtı',
  TEACHER: 'Öğretmen Yanıtı',
  FOLLOW_UP: 'Öğrenci Takip Sorusu'
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Yanıt Bekliyor',
  IN_PROGRESS: 'Üzerinde Çalışılıyor',
  ANSWERED: 'Çözüldü',
  FLAGGED: 'İnceleme Bekliyor'
};

export const TeacherQueuePage: React.FC = () => {
  const [questions, setQuestions] = useState<QuestionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [attachmentDrafts, setAttachmentDrafts] = useState<Record<string, File[]>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const loadQueue = async () => {
    try {
      setLoading(true);
      const data = await fetchTeacherQueue();
      setQuestions(data);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err, 'Soru listesi yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadQueue();
  }, []);

  const handleSubmit = async (question: QuestionDetail, event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setSubmitting(question.id);
      const payload = (responses[question.id] ?? '').trim();
      if (!payload) {
        setError('Yanıt metni boş olamaz.');
        return;
      }
      await submitTeacherAnswer({
        questionId: question.id,
        payload: { content: payload },
        files: attachmentDrafts[question.id]
      });
      setError(null);
      setResponses((prev) => ({ ...prev, [question.id]: '' }));
      setAttachmentDrafts((prev) => ({ ...prev, [question.id]: [] }));
      await loadQueue();
    } catch (err) {
      setError(extractErrorMessage(err, 'Yanıt gönderilemedi.'));
    } finally {
      setSubmitting(null);
    }
  };

  const handleFileChange = (questionId: string, fileList: FileList | null) => {
    if (!fileList) {
      setAttachmentDrafts((prev) => ({ ...prev, [questionId]: [] }));
      return;
    }

    setAttachmentDrafts((prev) => ({
      ...prev,
      [questionId]: Array.from(fileList).slice(0, 5)
    }));
  };

  const renderAttachments = (attachments?: MediaAttachment[]) => {
    if (!attachments || attachments.length === 0) {
      return null;
    }

    return (
      <div className="attachment-grid">
        {attachments.map((attachment) => (
          <div key={attachment.id} className="attachment-card">
            {attachment.type === 'IMAGE' ? (
              <img src={attachment.storagePath} alt={attachment.originalName} loading="lazy" />
            ) : (
              <video src={attachment.storagePath} controls preload="metadata" />
            )}
            <span>{attachment.originalName}</span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return <LoadingOverlay fullscreen message="Soru listesi hazırlanıyor..." />;
  }

  return (
    <section>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1>Öğretmen paneli</h1>
        <p>Uzmanlık alanınıza uygun sorular burada listelenir.</p>
      </header>
      {error && <p style={{ color: '#b91c1c' }}>{error}</p>}
      {questions.length === 0 && <p>Şu anda yanıt bekleyen soru bulunmuyor. Teşekkürler!</p>}
      {questions.map((question) => (
        <article key={question.id} className="card">
          <header>
            <h2>{question.title}</h2>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span>{question.subjectName}</span>
              <span>•</span>
              <span>{question.course}</span>
              <span>•</span>
              <span>{question.educationLevel}</span>
              <span className={`status-chip ${question.status ?? 'PENDING'}`}>
                {STATUS_LABELS[question.status ?? 'PENDING']}
              </span>
            </div>
          </header>
          <p style={{ whiteSpace: 'pre-wrap' }}>{question.description}</p>
          {question.attachments && question.attachments.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <strong>Ekler:</strong>
              <ul>
                {question.attachments.map((attachment) => (
                  <li key={attachment.id}>
                    <a href={attachment.storagePath} target="_blank" rel="noreferrer">
                      {attachment.originalName}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {question.answers.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <strong>Şu ana kadarki diyalog:</strong>
              {question.answers.map((answer) => (
                <div key={answer.id} style={{ marginTop: '0.75rem' }}>
                  <p style={{ whiteSpace: 'pre-wrap', marginBottom: '0.5rem' }}>
                    <em>{SOURCE_LABELS[answer.source] ?? answer.source}:</em> {answer.content}
                  </p>
                  {renderAttachments(answer.attachments)}
                </div>
              ))}
            </div>
          )}
          <form className="form-grid" onSubmit={(event) => void handleSubmit(question, event)}>
            <div className="form-group">
              <label htmlFor={`response-${question.id}`}>Yanıtınız</label>
              <textarea
                id={`response-${question.id}`}
                className="input"
                rows={6}
                required
                value={responses[question.id] ?? ''}
                onChange={(event) =>
                  setResponses((prev) => ({ ...prev, [question.id]: event.target.value }))
                }
              />
            </div>
            <div className="form-group">
              <label htmlFor={`attachments-${question.id}`}>Görsel/video ekle (en fazla 5 adet)</label>
              <input
                id={`attachments-${question.id}`}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={(event) => handleFileChange(question.id, event.target.files)}
              />
              {(attachmentDrafts[question.id] ?? []).length > 0 && (
                <ul className="attachment-preview-list">
                  {(attachmentDrafts[question.id] ?? []).map((file) => (
                    <li key={file.name}>{file.name}</li>
                  ))}
                </ul>
              )}
              <small style={{ color: 'var(--text-muted)' }}>
                Görseller 20MB, videolar 100MB ile sınırlandırılır ve gerekirse otomatik sıkıştırılır.
              </small>
            </div>
            <button className="button" type="submit" disabled={submitting === question.id}>
              {submitting === question.id ? 'Gönderiliyor...' : 'Yanıtı gönder'}
            </button>
          </form>
        </article>
      ))}
    </section>
  );
};
