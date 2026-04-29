import { FormEvent, useEffect, useState } from 'react';

import {
  fetchFriends,
  fetchPendingRequests,
  respondFriendRequest,
  sendFriendRequest
} from '../api/social';
import { extractErrorMessage } from '../utils/errorMessage';
import type { FriendSummary, FriendRequest, OutgoingRequest } from '../types';

export const FriendsPage: React.FC = () => {
  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<OutgoingRequest[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const [friendList, pending] = await Promise.all([fetchFriends(), fetchPendingRequests()]);
      setFriends(friendList);
      setIncoming(pending.incoming);
      setOutgoing(pending.outgoing);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err, 'Arkadaş listesi yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleSendRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await sendFriendRequest({ email });
      setEmail('');
      setSuccessMessage('Arkadaşlık isteği gönderildi.');
      setError(null);
      await load();
    } catch (err) {
      setSuccessMessage(null);
      setError(extractErrorMessage(err, 'İstek gönderilemedi.'));
    }
  };

  const handleRespond = async (friendshipId: string, action: 'ACCEPT' | 'DECLINE') => {
    try {
      await respondFriendRequest({ friendshipId, action });
      await load();
    } catch (err) {
      setError(extractErrorMessage(err, 'İstek yanıtlanamadı.'));
    }
  };

  return (
    <section className="card" style={{ maxWidth: '960px', margin: '0 auto' }}>
      <span className="badge">Arkadaşlarım</span>
      <h1>Topluluk bağlantıların</h1>
      <p style={{ color: 'var(--text-muted)' }}>
        Diğer öğrenciler ve öğretmenlerle bağlantı kur, özel mesajlaşma ve ortak çalışma alanlarını aç.
      </p>
      <form onSubmit={handleSendRequest} style={{ margin: '1.5rem 0', display: 'flex', gap: '0.75rem' }}>
        <input
          className="input"
          type="email"
          placeholder="E-posta ile arkadaş ekle"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <button className="button" type="submit">
          Davet Gönder
        </button>
      </form>
      {successMessage && <p style={{ color: 'var(--success)' }}>{successMessage}</p>}
      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
      {loading ? (
        <p>Yükleniyor...</p>
      ) : (
        <div className="form-grid columns-2">
          <div className="card" style={{ boxShadow: 'var(--shadow-md)', marginBottom: 0 }}>
            <h2>Arkadaşlar</h2>
            {friends.length === 0 && <p>Henüz bağlantı kurmadın.</p>}
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {friends.map((item) => (
                <li key={item.friendshipId} style={{ padding: '0.6rem 0', borderBottom: '1px solid rgba(15, 23, 42, 0.07)' }}>
                  <strong>
                    {item.friend.firstName} {item.friend.lastName}
                  </strong>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    @{item.friend.username ?? 'belirtilmedi'}
                  </div>
                  {item.friend.email && (
                    <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {item.friend.email}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="card" style={{ boxShadow: 'var(--shadow-md)', marginBottom: 0 }}>
            <h2>Bekleyen istekler</h2>
            <div>
              <h3>Gelen</h3>
              {incoming.length === 0 && <p>Bekleyen isteğin yok.</p>}
              {incoming.map((request) => (
                <div
                  key={request.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.75rem',
                    paddingBottom: '0.75rem',
                    borderBottom: '1px solid rgba(15, 23, 42, 0.07)'
                  }}
                >
                  <div>
                    <strong>
                      {request.requester.firstName} {request.requester.lastName}
                    </strong>
                    <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {request.requester.email}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="button" type="button" onClick={() => handleRespond(request.id, 'ACCEPT')}>
                      Kabul et
                    </button>
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() => handleRespond(request.id, 'DECLINE')}
                    >
                      Reddet
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <h3>Gönderilen</h3>
              {outgoing.length === 0 && <p>Gönderdiğin bekleyen isteğin yok.</p>}
              {outgoing.map((request) => (
                <div key={request.id} style={{ marginBottom: '0.5rem' }}>
                  <strong>
                    {request.addressee.firstName} {request.addressee.lastName}
                  </strong>
                  <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {request.addressee.email}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
