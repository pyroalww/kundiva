import { FormEvent, useEffect, useMemo, useState } from 'react';

import { fetchConversation, fetchMessagePartners, sendMessage } from '../api/social';
import { extractErrorMessage } from '../utils/errorMessage';
import type { DirectMessage } from '../types';
import { LoadingOverlay } from '../components/LoadingOverlay';

export const MessagesPage: React.FC = () => {
  const [partners, setPartners] = useState<
    Array<{ id: string; firstName: string; lastName: string; username?: string | null }>
  >([]);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversationLoading, setConversationLoading] = useState(false);

  useEffect(() => {
    const loadPartners = async () => {
      try {
        setLoading(true);
        const data = await fetchMessagePartners();
        setPartners(data);
        setError(null);
        if (data.length > 0) {
          setSelectedPartner((prev) => prev ?? data[0].id);
        }
      } catch (err) {
        setError(extractErrorMessage(err, 'Arkadaş listeniz yüklenemedi.'));
      } finally {
        setLoading(false);
      }
    };

    void loadPartners();
  }, []);

  useEffect(() => {
    if (!selectedPartner) {
      setMessages([]);
      return;
    }

    const loadConversation = async () => {
      try {
        setConversationLoading(true);
        const data = await fetchConversation(selectedPartner);
        setMessages(data);
        setError(null);
      } catch (err) {
        setError(extractErrorMessage(err, 'Konuşma yüklenemedi.'));
      } finally {
        setConversationLoading(false);
      }
    };

    void loadConversation();
  }, [selectedPartner]);

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPartner || !draft.trim()) {
      return;
    }
    try {
      setSending(true);
      const message = await sendMessage({ receiverId: selectedPartner, content: draft });
      setMessages((prev) => [...prev, message]);
      setDraft('');
    } catch (err) {
      setError(extractErrorMessage(err, 'Mesaj gönderilemedi.'));
    } finally {
      setSending(false);
    }
  };

  const activePartner = useMemo(
    () => partners.find((partner) => partner.id === selectedPartner),
    [partners, selectedPartner]
  );

  return (
    <section className="card messages-page">
      <aside className="messages-sidebar">
        <div className="messages-sidebar-header">
          <span className="badge">Mesajlar</span>
          <h2>Arkadaşlar</h2>
        </div>
        {loading && <LoadingOverlay subtle message="Arkadaşlar yükleniyor..." />}
        {!loading && partners.length === 0 && <p className="messages-empty">Mesajlaşmak için önce arkadaş ekleyin.</p>}
        <ul className="messages-partner-list">
          {partners.map((partner) => {
            const active = partner.id === selectedPartner;
            return (
              <li key={partner.id}>
                <button
                  type="button"
                  className={`messages-partner ${active ? 'active' : ''}`}
                  onClick={() => setSelectedPartner(partner.id)}
                >
                  <span className="partner-name">
                    {partner.firstName} {partner.lastName}
                  </span>
                  <span className="partner-hint">@{partner.username ?? 'kullanıcı'}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <div className="messages-body">
        {activePartner ? (
          <>
            <header className="messages-header">
              <div>
                <h2>
                  {activePartner.firstName} {activePartner.lastName}
                </h2>
                <p>@{activePartner.username ?? 'kullanıcı'} • Güvenli mesajlaşma</p>
              </div>
            </header>

            <main className="messages-history">
              {conversationLoading && <LoadingOverlay subtle message="Konuşma yükleniyor..." />}
              {!conversationLoading && messages.length === 0 && (
                <p className="messages-empty">Henüz mesaj yok. İlk mesajı sen gönder!</p>
              )}
              {!conversationLoading &&
                messages.map((message) => {
                  const incoming = message.senderId === selectedPartner;
                  return (
                    <div key={message.id} className={`message-row ${incoming ? 'incoming' : 'outgoing'}`}>
                      <div className={`message-bubble ${incoming ? 'incoming' : 'outgoing'}`}>
                        <span>{message.content}</span>
                      </div>
                      <time>{new Date(message.createdAt).toLocaleString('tr-TR')}</time>
                    </div>
                  );
                })}
            </main>

            <form className="messages-form" onSubmit={handleSend}>
              <input
                className="input"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Mesajınızı yazın"
                required
              />
              <button className="button" type="submit" disabled={sending}>
                {sending ? 'Gönderiliyor...' : 'Gönder'}
              </button>
            </form>
          </>
        ) : (
          <div className="messages-empty">Mesajlaşmak için bir arkadaş seçin.</div>
        )}
        {error && <p className="error-text">{error}</p>}
      </div>
    </section>
  );
};
