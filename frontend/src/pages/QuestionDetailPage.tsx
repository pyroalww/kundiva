import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

import {
  fetchQuestionDetail,
  generatePracticeQuestion,
  postComment,
  submitFollowUp,
  submitSolution,
  markSolution,
  submitTeacherAnswer
} from '../api/questions';
import {
  updateAdminQuestion, adminAiSolve, adminAddSolution, adminMarkSolution,
  updateAdminAnswer, deleteAdminAnswer, deleteAdminQuestion
} from '../api/admin';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { useAuth } from '../hooks/useAuth';
import type { Comment, MediaAttachment, QuestionDetail, StudentSolution } from '../types';
import { extractErrorMessage } from '../utils/errorMessage';
import type { PracticeQuestion } from '@kundiva/shared';

const SOURCE_LABELS: Record<string, string> = {
  AI: '🤖 KundivaAI Yanıtı',
  TEACHER: '👨‍🏫 Öğretmen Yanıtı',
  FOLLOW_UP: '📝 Öğrenci Takip Sorusu'
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Beklemede',
  IN_PROGRESS: 'Çözülüyor',
  ANSWERED: 'Çözüldü',
  FLAGGED: 'İnceleniyor'
};

const parseAIContent = (content: string) => {
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

const renderAIAnswer = (parsed: Record<string, unknown>) => {
  const sections: Array<{ key: string; label: string }> = [
    { key: 'summary', label: 'Özet' },
    { key: 'solution', label: 'Çözüm' },
    { key: 'steps', label: 'Adımlar' },
    { key: 'explanation', label: 'Açıklama' },
    { key: 'hints', label: 'İpuçları' },
    { key: 'furtherReading', label: 'Ek Okumalar' }
  ];

  return (
    <div className="ai-answer-sections">
      {sections.map(({ key, label }) => {
        const value = parsed[key];
        if (!value) return null;

        const content = typeof value === 'string'
          ? value
          : Array.isArray(value)
            ? value.map((item, i) => typeof item === 'string' ? `${i + 1}. ${item}` : JSON.stringify(item)).join('\n')
            : JSON.stringify(value, null, 2);

        return (
          <div key={key} style={{ marginBottom: '1rem' }}>
            <h4 style={{ color: 'var(--primary)', marginBottom: '0.3rem' }}>{label}</h4>
            <MarkdownRenderer content={content} />
          </div>
        );
      })}
    </div>
  );
};

export const QuestionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [followUpText, setFollowUpText] = useState('');
  const [followUpSolver, setFollowUpSolver] = useState<'AI' | 'TEACHER'>('TEACHER');
  const [followUpLoading, setFollowUpLoading] = useState(false);

  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentLoading, setCommentLoading] = useState<string | null>(null);

  const [practiceQ, setPracticeQ] = useState<PracticeQuestion | null>(null);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [practiceAnswer, setPracticeAnswer] = useState<number | null>(null);

  const [solutionText, setSolutionText] = useState('');
  const [solutionLoading, setSolutionLoading] = useState(false);
  const [markLoading, setMarkLoading] = useState<string | null>(null);

  const [teacherResponse, setTeacherResponse] = useState('');
  const [teacherAttachments, setTeacherAttachments] = useState<File[]>([]);
  const [teacherSubmitting, setTeacherSubmitting] = useState(false);

  // Admin editing states
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [editDesc, setEditDesc] = useState('');
  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
  const [editAnswerContent, setEditAnswerContent] = useState('');
  const [adminSolText, setAdminSolText] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const isAdmin = user?.role === 'ADMIN';

  const loadQuestion = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await fetchQuestionDetail(id);
      setQuestion(data);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err, 'Soru yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadQuestion();
  }, [loadQuestion]);

  // Auto-refresh for AI processing
  useEffect(() => {
    if (!question) return;
    if (question.useKundivaAi && (question.status === 'PENDING' || question.status === 'IN_PROGRESS')) {
      const interval = setInterval(() => {
        void loadQuestion();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [question?.status, question?.useKundivaAi, loadQuestion]);

  const handleFollowUp = async (e: FormEvent) => {
    e.preventDefault();
    if (!question || !followUpText.trim()) return;
    try {
      setFollowUpLoading(true);
      const updated = await submitFollowUp({
        questionId: question.id,
        payload: { content: followUpText, solverType: followUpSolver }
      });
      setQuestion(updated);
      setFollowUpText('');
    } catch (err) {
      setError(extractErrorMessage(err, 'Takip sorusu gönderilemedi.'));
    } finally {
      setFollowUpLoading(false);
    }
  };

  const handleComment = async (answerId: string) => {
    const content = (commentDrafts[answerId] ?? '').trim();
    if (!content) return;
    try {
      setCommentLoading(answerId);
      await postComment({ answerId, payload: { content } });
      setCommentDrafts((prev) => ({ ...prev, [answerId]: '' }));
      void loadQuestion();
    } catch (err) {
      setError(extractErrorMessage(err, 'Yorum eklenemedi.'));
    } finally {
      setCommentLoading(null);
    }
  };

  const handlePractice = async () => {
    if (!question) return;
    try {
      setPracticeLoading(true);
      const result = await generatePracticeQuestion({ questionId: question.id });
      setPracticeQ(result);
      setPracticeAnswer(null);
    } catch (err) {
      setError(extractErrorMessage(err, 'Benzer soru üretilemedi.'));
    } finally {
      setPracticeLoading(false);
    }
  };

  const handleSubmitSolution = async () => {
    if (!question || !solutionText.trim()) return;
    try {
      setSolutionLoading(true);
      await submitSolution({ questionId: question.id, content: solutionText.trim() });
      setSolutionText('');
      void loadQuestion();
    } catch (err) {
      setError(extractErrorMessage(err, 'Çözüm gönderilemedi.'));
    } finally {
      setSolutionLoading(false);
    }
  };

  const handleMarkSolution = async (solutionId: string, isCorrect: boolean) => {
    if (!question) return;
    try {
      setMarkLoading(solutionId);
      await markSolution({ questionId: question.id, solutionId, isCorrect });
      void loadQuestion();
    } catch (err) {
      setError(extractErrorMessage(err, 'Çözüm değerlendirilemedi.'));
    } finally {
      setMarkLoading(null);
    }
  };

  const handleTeacherSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!question || !teacherResponse.trim()) return;
    try {
      setTeacherSubmitting(true);
      await submitTeacherAnswer({
        questionId: question.id,
        payload: { content: teacherResponse },
        files: teacherAttachments
      });
      setTeacherResponse('');
      setTeacherAttachments([]);
      void loadQuestion();
    } catch (err) {
      setError(extractErrorMessage(err, 'Yanıt gönderilemedi.'));
    } finally {
      setTeacherSubmitting(false);
    }
  };

  const renderAttachments = (attachments?: MediaAttachment[]) => {
    if (!attachments || attachments.length === 0) return null;
    return (
      <div className="attachment-grid" style={{ marginTop: '0.5rem' }}>
        {attachments.map((att) => (
          <div key={att.id} className="attachment-card">
            {att.type === 'IMAGE' ? (
              <img src={att.storagePath} alt={att.originalName} loading="lazy" />
            ) : (
              <video src={att.storagePath} controls preload="metadata" />
            )}
            <span style={{ fontSize: '0.75rem' }}>{att.originalName}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderComments = (answerId: string, comments?: Comment[]) => (
    <div style={{ marginTop: '0.75rem', paddingLeft: '1rem', borderLeft: '2px solid rgba(15,23,42,0.06)' }}>
      {comments?.map((comment) => (
        <div key={comment.id} style={{ marginBottom: '0.5rem' }}>
          <div style={{ fontSize: '0.85rem' }}>
            <strong>{comment.author.firstName} {comment.author.lastName}</strong>
            {comment.author.role && (
              <span className="badge" style={{ marginLeft: '0.4rem', fontSize: '0.65rem' }}>
                {comment.author.role === 'TEACHER' ? 'Öğretmen' : comment.author.role === 'ADMIN' ? 'Admin' : ''}
              </span>
            )}
            <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem', fontSize: '0.75rem' }}>
              {new Date(comment.createdAt).toLocaleString('tr-TR')}
            </span>
          </div>
          <p style={{ fontSize: '0.9rem', marginTop: '0.2rem' }}>{comment.content}</p>
          {comment.replies?.map((reply) => (
            <div key={reply.id} style={{ marginLeft: '1rem', marginTop: '0.35rem' }}>
              <div style={{ fontSize: '0.8rem' }}>
                <strong>{reply.author.firstName} {reply.author.lastName}</strong>
                <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem', fontSize: '0.7rem' }}>
                  {new Date(reply.createdAt).toLocaleString('tr-TR')}
                </span>
              </div>
              <p style={{ fontSize: '0.85rem' }}>{reply.content}</p>
            </div>
          ))}
        </div>
      ))}

      {user && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <input
            className="input"
            style={{ flex: 1, fontSize: '0.85rem' }}
            placeholder="Yorum yaz..."
            value={commentDrafts[answerId] ?? ''}
            onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [answerId]: e.target.value }))}
          />
          <button
            className="button ghost"
            type="button"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
            disabled={commentLoading === answerId}
            onClick={() => handleComment(answerId)}
          >
            Gönder
          </button>
        </div>
      )}
    </div>
  );

  if (loading) return <LoadingOverlay fullscreen message="Soru yükleniyor..." />;
  if (!question) return <div className="card"><p>Soru bulunamadı.</p></div>;

  const isOwner = user?.id === question.studentId;
  const canAdmin = user?.role === 'ADMIN';
  const solutions = question.solutions ?? [];

  return (
    <section>
      {error && <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</p>}

      {/* Question header */}
      <div className="card fade-in-up">
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 style={{ marginBottom: '0.5rem' }}>
              {editingTitle ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 1 }}>
                  <input className="input" value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ flex: 1 }} />
                  <button className="button" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }} onClick={async () => { await updateAdminQuestion(question.id, { title: editTitle }); setEditingTitle(false); void loadQuestion(); }}>Kaydet</button>
                  <button className="button ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => setEditingTitle(false)}>İptal</button>
                </div>
              ) : (
                <>{question.title}
                  {canAdmin && <button className="button ghost" onClick={() => { setEditTitle(question.title); setEditingTitle(true); }} style={{ marginLeft: '0.5rem', padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}>✏️</button>}
                </>
              )}
              {question.useKundivaAi && (
                <span className="badge" style={{ marginLeft: '0.75rem', background: 'rgba(139,92,246,0.15)', color: '#7c3aed' }}>
                  KundivaAI ✓
                </span>
              )}
            </h1>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <span>{question.subjectName}</span>
              <span>•</span>
              <span>{question.course}</span>
              <span>•</span>
              <span>{question.educationLevel}</span>
              {question.student && (
                <>
                  <span>•</span>
                  <Link to={`/profile/${(question as any).student?.username ?? question.studentId}`} style={{ color: 'var(--primary)' }}>Soran: {question.student.firstName} {question.student.lastName}</Link>
                </>
              )}
              <span>•</span>
              <span>{new Date(question.createdAt).toLocaleString('tr-TR')}</span>
            </div>
          </div>
          <span className={`status-chip ${question.status ?? 'PENDING'}`}>
            {STATUS_LABELS[question.status ?? 'PENDING']}
          </span>
        </div>
        {editingDesc ? (
          <div style={{ marginTop: '1rem' }}>
            <textarea className="input" rows={6} value={editDesc} onChange={e => setEditDesc(e.target.value)} />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button className="button" style={{ fontSize: '0.85rem' }} onClick={async () => { await updateAdminQuestion(question.id, { description: editDesc }); setEditingDesc(false); void loadQuestion(); }}>Kaydet</button>
              <button className="button ghost" style={{ fontSize: '0.85rem' }} onClick={() => setEditingDesc(false)}>İptal</button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: '1rem' }}>
            <MarkdownRenderer content={question.description} />
            {canAdmin && <button className="button ghost" onClick={() => { setEditDesc(question.description); setEditingDesc(true); }} style={{ marginTop: '0.5rem', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>✏️ Düzenle</button>}
          </div>
        )}
        {question.attachments && question.attachments.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            {question.attachments.map((att) => (
              <img key={att.id} src={att.storagePath} alt={att.originalName} style={{ maxWidth: '100%', borderRadius: '12px' }} />
            ))}
          </div>
        )}

        {/* AI processing indicator */}
        {question.useKundivaAi && (question.status === 'PENDING' || question.status === 'IN_PROGRESS') && (
          <div className="card" style={{
            marginTop: '1rem',
            background: 'linear-gradient(135deg, rgba(139,92,246,0.06), rgba(59,130,246,0.04))',
            border: '1px solid rgba(139,92,246,0.12)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🤖</div>
            <p style={{ color: 'var(--primary)', fontWeight: 600 }}>KundivaAI çözüm hazırlıyor...</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Çözüm arka planda işleniyor, hazır olduğunda burada görüntülenecektir.
            </p>
          </div>
        )}

        {/* Admin toolbar */}
        {canAdmin && (
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '1rem' }}>
            <button className="button ghost" style={{ fontSize: '0.8rem' }} disabled={adminLoading} onClick={async () => { setAdminLoading(true); try { await adminAiSolve(question.id); void loadQuestion(); } catch {} setAdminLoading(false); }}>🤖 AI ile çözdür</button>
            <button className="button ghost" style={{ fontSize: '0.8rem', color: 'var(--danger)' }} onClick={async () => { if (!confirm('Soruyu silmek istediğinize emin misiniz?')) return; await deleteAdminQuestion(question.id); window.location.href = '/library'; }}>🗑 Soruyu sil</button>
          </div>
        )}
      </div>

      {/* Answers */}
      {question.answers.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Yanıtlar</h2>
          {question.answers.map((answer) => {
            const aiParsed = answer.source === 'AI' ? parseAIContent(answer.content) : null;
            return (
              <div key={answer.id} className="card fade-in-up" style={{
                marginBottom: '1rem',
                borderLeft: answer.source === 'AI'
                  ? '4px solid rgba(139,92,246,0.4)'
                  : answer.source === 'TEACHER'
                    ? '4px solid rgba(16,185,129,0.4)'
                    : '4px solid rgba(59,130,246,0.3)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{SOURCE_LABELS[answer.source] ?? answer.source}</span>
                    {answer.author && answer.source === 'TEACHER' && (
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        — {answer.author.firstName} {answer.author.lastName}
                      </span>
                    )}
                    {answer.author && answer.source === 'FOLLOW_UP' && (
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        — {answer.author.firstName} {answer.author.lastName}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(answer.createdAt).toLocaleString('tr-TR')}
                  </span>
                </div>

                {editingAnswerId === answer.id ? (
                  <div>
                    <textarea className="input" rows={5} value={editAnswerContent} onChange={e => setEditAnswerContent(e.target.value)} />
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button className="button" style={{ fontSize: '0.8rem' }} onClick={async () => { await updateAdminAnswer(answer.id, editAnswerContent); setEditingAnswerId(null); void loadQuestion(); }}>Kaydet</button>
                      <button className="button ghost" style={{ fontSize: '0.8rem' }} onClick={() => setEditingAnswerId(null)}>İptal</button>
                    </div>
                  </div>
                ) : aiParsed ? renderAIAnswer(aiParsed) : (
                  <MarkdownRenderer content={answer.content} />
                )}
                {canAdmin && editingAnswerId !== answer.id && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button className="button ghost" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} onClick={() => { setEditingAnswerId(answer.id); setEditAnswerContent(answer.content); }}>✏️ Düzenle</button>
                    <button className="button ghost" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', color: 'var(--danger)' }} onClick={async () => { if (!confirm('Yanıtı silmek?')) return; await deleteAdminAnswer(answer.id); void loadQuestion(); }}>🗑 Sil</button>
                  </div>
                )}

                {renderAttachments(answer.attachments)}
                {renderComments(answer.id, answer.comments)}
              </div>
            );
          })}
        </div>
      )}

      {/* Student solutions section */}
      <div style={{ marginTop: '1.5rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>
          📝 Öğrenci çözümleri
          <span className="badge" style={{ marginLeft: '0.5rem' }}>{solutions.length}</span>
        </h2>

        {solutions.map((solution) => (
          <div key={solution.id} className="card fade-in-up" style={{
            marginBottom: '0.75rem',
            borderLeft: solution.isCorrect === true
              ? '4px solid rgba(16,185,129,0.5)'
              : solution.isCorrect === false
                ? '4px solid rgba(239,68,68,0.3)'
                : '4px solid rgba(15,23,42,0.08)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <strong>{solution.author.firstName} {solution.author.lastName}</strong>
                <span className="badge" style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>
                  ⭐ {solution.author.totalPoints} puan
                </span>
                {solution.isCorrect === true && (
                  <span className="badge" style={{ marginLeft: '0.3rem', background: 'rgba(16,185,129,0.15)', color: '#047857' }}>
                    ✓ Doğru
                  </span>
                )}
                {solution.isCorrect === false && (
                  <span className="badge" style={{ marginLeft: '0.3rem', background: 'rgba(239,68,68,0.15)', color: '#b91c1c' }}>
                    ✗ Yanlış
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {new Date(solution.createdAt).toLocaleString('tr-TR')}
              </span>
            </div>
            <div style={{ marginTop: '0.5rem' }}><MarkdownRenderer content={solution.content} /></div>

            {/* Mark as correct/incorrect - only question owner */}
            {(isOwner || canAdmin) && solution.isCorrect === null && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button
                  className="button"
                  type="button"
                  style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem' }}
                  disabled={markLoading === solution.id}
                  onClick={() => canAdmin ? adminMarkSolution(question.id, solution.id, true).then(() => loadQuestion()) : handleMarkSolution(solution.id, true)}
                >
                  ✓ Doğru
                </button>
                <button
                  className="button secondary"
                  type="button"
                  style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem' }}
                  disabled={markLoading === solution.id}
                  onClick={() => canAdmin ? adminMarkSolution(question.id, solution.id, false).then(() => loadQuestion()) : handleMarkSolution(solution.id, false)}
                >
                  ✗ Yanlış
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Submit solution form - only students who are NOT the question owner */}
        {user?.role === 'STUDENT' && !isOwner && (
          <div className="card fade-in-up" style={{ marginTop: '1rem' }}>
            <h3>Çözüm yükle</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Doğru çözümler 10 puan ve 1 AI kredisi kazandırır!
            </p>
            <div className="form-group">
              <textarea
                className="input"
                rows={5}
                placeholder="Çözümünüzü detaylı yazınız..."
                value={solutionText}
                onChange={(e) => setSolutionText(e.target.value)}
              />
            </div>
            <button
              className="button"
              type="button"
              disabled={solutionLoading || !solutionText.trim()}
              onClick={handleSubmitSolution}
            >
              {solutionLoading ? 'Gönderiliyor...' : 'Çözüm gönder'}
            </button>
          </div>
        )}
      </div>

      {/* Follow-up section - only question owner */}
      {isOwner && question.status === 'ANSWERED' && (
        <div className="card fade-in-up" style={{ marginTop: '1.5rem' }}>
          <h3>Takip sorusu sor</h3>
          <form onSubmit={handleFollowUp}>
            <div className="form-group">
              <textarea
                className="input"
                rows={4}
                placeholder="Ek sorunuzu yazın..."
                value={followUpText}
                onChange={(e) => setFollowUpText(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <select
                className="input"
                style={{ width: 'auto' }}
                value={followUpSolver}
                onChange={(e) => setFollowUpSolver(e.target.value as 'AI' | 'TEACHER')}
              >
                <option value="TEACHER">Öğretmen yanıtlasın</option>
                <option value="AI">KundivaAI yanıtlasın</option>
              </select>
              <button className="button" type="submit" disabled={followUpLoading || !followUpText.trim()}>
                {followUpLoading ? 'Gönderiliyor...' : 'Gönder'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Teacher Answer form - only teachers */}
      {user?.role === 'TEACHER' && question.status !== 'ANSWERED' && (
        <div className="card fade-in-up" style={{ marginTop: '1rem' }}>
          <h3>Öğretmen Yanıtı</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Soruya yanıt vererek öğrenciye destek olun.
          </p>
          <form className="form-grid" onSubmit={handleTeacherSubmit}>
            <div className="form-group">
              <label htmlFor="teacher-response">Yanıtınız</label>
              <textarea
                id="teacher-response"
                className="input"
                rows={5}
                required
                value={teacherResponse}
                onChange={(e) => setTeacherResponse(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="teacher-attachments">Görsel/video ekle</label>
              <input
                id="teacher-attachments"
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={(e) => setTeacherAttachments(e.target.files ? Array.from(e.target.files).slice(0, 5) : [])}
              />
            </div>
            <button className="button" type="submit" disabled={teacherSubmitting || !teacherResponse.trim()}>
              {teacherSubmitting ? 'Gönderiliyor...' : 'Yanıtı gönder'}
            </button>
          </form>
        </div>
      )}

      {/* Practice question section */}
      {isOwner && question.status === 'ANSWERED' && (
        <div className="card fade-in-up" style={{ marginTop: '1rem' }}>
          <h3>Benzer soru üret</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Öğrenmenizi pekiştirmek için benzer bir soru oluşturun.
          </p>
          <button
            className="button ghost"
            type="button"
            disabled={practiceLoading}
            onClick={handlePractice}
          >
            {practiceLoading ? 'Üretiliyor...' : 'Benzer soru oluştur'}
          </button>

          {practiceQ && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(15,23,42,0.02)', borderRadius: '12px' }}>
              <p style={{ fontWeight: 600, marginBottom: '0.75rem' }}>{practiceQ.prompt}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {practiceQ.options.map((opt, i) => {
                  const isSelected = practiceAnswer === i;
                  const isCorrect = practiceAnswer !== null && i === practiceQ.correctIndex;
                  const isWrong = isSelected && i !== practiceQ.correctIndex;

                  return (
                    <button
                      key={i}
                      type="button"
                      className={`button ${isCorrect ? '' : isWrong ? 'secondary' : 'ghost'}`}
                      style={{
                        textAlign: 'left',
                        borderColor: isCorrect ? '#10b981' : isWrong ? '#ef4444' : undefined
                      }}
                      disabled={practiceAnswer !== null}
                      onClick={() => setPracticeAnswer(i)}
                    >
                      {String.fromCharCode(65 + i)}) {opt}
                    </button>
                  );
                })}
              </div>
              {practiceAnswer !== null && (
                <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(139,92,246,0.06)', borderRadius: '8px' }}>
                  <p style={{ fontWeight: 600 }}>
                    {practiceAnswer === practiceQ.correctIndex ? '✅ Doğru!' : '❌ Yanlış.'}
                  </p>
                  <p style={{ fontSize: '0.9rem', marginTop: '0.3rem' }}>{practiceQ.explanation}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )
      }

      <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <Link to="/library" className="button ghost">← Kütüphaneye dön</Link>
      </div>
    </section >
  );
};
