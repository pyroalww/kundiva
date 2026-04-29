import { FormEvent, useEffect, useMemo, useState } from 'react';

import { fetchSupportInfo, fetchSupportSession, sendSupportMessage } from '../api/support';
import { useAuth } from '../hooks/useAuth';
import { LoadingOverlay } from '../components/LoadingOverlay';
import type { SupportInfo, SupportMessage, SupportSession } from '../types';
import { extractErrorMessage } from '../utils/errorMessage';

export const SupportPage: React.FC = () => {
  const { user } = useAuth();

  const [info, setInfo] = useState<SupportInfo | null>(null);
  const [session, setSession] = useState<SupportSession | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [messageDraft, setMessageDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchSupportInfo();
        setInfo(data);
      } catch (err) {
        setError(extractErrorMessage(err, 'Destek bilgileri yüklenemedi.'));
      }

      if (user) {
        try {
          const currentSession = await fetchSupportSession();
          setSession(currentSession);
          setMessages(currentSession?.messages ?? []);
        } catch (err) {
          setError(extractErrorMessage(err, 'Destek oturumu alınamadı.'));
        }
      } else {
        setSession(null);
        setMessages([]);
      }

      setLoading(false);
    };

    void load();
  }, [user]);

  const sortedMessages = useMemo(
    () =>
      [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [messages]
  );

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      setError('Canlı destek için giriş yapmalısınız.');
      return;
    }

    const trimmed = messageDraft.trim();
    if (!trimmed) {
      return;
    }

    try {
      setSending(true);
      const response = await sendSupportMessage(trimmed);
      setMessageDraft('');
      setQueuePosition(
        typeof response.queuePosition === 'number' ? Math.max(response.queuePosition, 0) : null
      );
      setMessages(response.messages);
      if (!session) {
        setSession({
          ticket: {
            id: response.ticketId,
            status: 'OPEN',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          messages: response.messages
        });
      }
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err, 'Mesaj gönderilemedi.'));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <LoadingOverlay fullscreen message="Destek ekranı hazırlanıyor..." />;
  }

  return (
    <section className="support-page">
      <header className="card support-hero">
        <span className="badge">Destek &amp; SSS</span>
        <h1>Size nasıl yardımcı olabiliriz?</h1>
        <p>
          {info?.info.description ??
            'Kundiva ekibi olarak sorularınızı yanıtlamak için buradayız. Sıkça sorulan soruları inceleyebilir veya canlı destek botundan yardımcı olmasını isteyebilirsiniz.'}
        </p>
        <div className="support-meta">
          <div>
            <strong>Proje</strong>
            <span>{info?.info.project ?? 'Şeyh İsa Anadolu Lisesi / TÜBİTAK 4006'}</span>
          </div>
          <div>
            <strong>Yazılım ekibi</strong>
            <span>{info?.info.softwareTeam ?? 'Çağan DOĞAN ve Ömer BÜKE'}</span>
          </div>
          <div>
            <strong>Destek saatleri</strong>
            <span>Günlük 08:00 - 22:00</span>
          </div>
        </div>
      </header>

      <div className="support-layout">
        <section className="card support-faq">
          <h2>Sıkça sorulan sorular</h2>
          <div className="faq-list">
            {info?.faqs.map((faq, index) => (
              <details key={faq.question} open={index === 0}>
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="card support-chat">
          <h2>Canlı destek botu</h2>
          {!user && <p>Canlı destek botunu kullanmak için lütfen giriş yapın.</p>}
          {user && (
            <>
              <div className="chat-history">
                {sortedMessages.length === 0 && <p>Henüz bir konuşma bulunmuyor. İlk sorunuzu yazın.</p>}
                {sortedMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`chat-bubble ${message.senderType === 'USER' ? 'from-user' : 'from-bot'}`}
                  >
                    <div className="bubble-meta">
                      <span>{message.senderType === 'USER' ? 'Siz' : 'Kundiva Botu'}</span>
                      <time>{new Date(message.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</time>
                    </div>
                    <p>{message.content}</p>
                  </div>
                ))}
                {queuePosition && queuePosition > 0 && (
                  <div className="queue-indicator">
                    Sırada bekleyen {queuePosition} destek isteği var. Yanıt saniyeler içinde hazır olacak.
                  </div>
                )}
              </div>
              <form className="chat-input" onSubmit={handleSend}>
                <textarea
                  value={messageDraft}
                  onChange={(event) => setMessageDraft(event.target.value)}
                  placeholder="Destek botuna sorunuzu yazın"
                  rows={3}
                  disabled={sending}
                  required
                />
                <div className="chat-actions">
                  <small>Yanıtlar güvenlik için kuyruğa alınır. Rate limit uygulanırsa bot bilgilendirme yapar.</small>
                  <button className="button" type="submit" disabled={sending}>
                    {sending ? 'Hazırlanıyor...' : 'Gönder'}
                  </button>
                </div>
              </form>
            </>
          )}
          {error && <p className="error-text">{error}</p>}
        </section>
      </div>
    </section>
  );
};
