import { FormEvent, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  createAdminAccount,
  createAdminAccountsBulk,
  deleteAdminComment,
  deleteAdminQuestion,
  deleteAdminUser,
  fetchAdminComments,
  fetchAdminFriendships,
  fetchAdminMessages,
  fetchAdminOverview,
  fetchAdminQuestions,
  fetchAdminUsers,
  fetchAdminSettings,
  updateAdminSettings,
  fetchAdminUsageMetrics,
  fetchAdminApiKeys,
  createAdminApiKey,
  updateAdminApiKey,
  fetchSupportTickets,
  generateImagenPreview,
  sanctionAdminUser,
  liftAdminSanction,
  fetchAdminAuditLogs,
  fetchAdminBannedIps,
  createAdminBannedIp,
  deleteAdminBannedIp,
  flagAdminMessage,
  updateAdminUserRole
} from '../api/admin';
import { extractErrorMessage } from '../utils/errorMessage';
import { LoadingOverlay } from '../components/LoadingOverlay';

const ROLE_OPTIONS = [
  { value: 'STUDENT', label: 'Öğrenci' },
  { value: 'TEACHER', label: 'Öğretmen' },
  { value: 'ADMIN', label: 'Admin' }
];

export const AdminDashboardPage: React.FC = () => {
  const [overview, setOverview] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [friendships, setFriendships] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [usageMetrics, setUsageMetrics] = useState<{ totals: Record<string, number>; recent: any[] } | null>(null);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [bannedIps, setBannedIps] = useState<any[]>([]);
  const [apiKeyForm, setApiKeyForm] = useState<{ provider: 'GEMINI' | 'IMAGEN'; key: string; priority: string }>(
    {
      provider: 'GEMINI',
      key: '',
      priority: ''
    }
  );
  const [imagenPrompt, setImagenPrompt] = useState('');
  const [imagenPreview, setImagenPreview] = useState<{
    model: string;
    images: Array<{ index: number; base64: string; mimeType: string; sizeBytes: number }>;
  } | null>(null);
  const [imagenLoading, setImagenLoading] = useState(false);
  const [ipBanForm, setIpBanForm] = useState<{ ipAddress: string; reason: string; expiresAt: string }>({
    ipAddress: '',
    reason: '',
    expiresAt: ''
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [sanctionLoading, setSanctionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'users'
    | 'questions'
    | 'comments'
    | 'messages'
    | 'friendships'
    | 'settings'
    | 'usage'
    | 'apiKeys'
    | 'support'
    | 'security'
  >('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        overviewData,
        userData,
        questionData,
        commentData,
        messageData,
        friendshipData,
        settingsData,
        usageData,
        apiKeyData,
        supportData,
        auditData,
        bannedIpData
      ] = await Promise.all([
        fetchAdminOverview(),
        fetchAdminUsers(),
        fetchAdminQuestions(),
        fetchAdminComments(),
        fetchAdminMessages(),
        fetchAdminFriendships(),
        fetchAdminSettings(),
        fetchAdminUsageMetrics(),
        fetchAdminApiKeys(),
        fetchSupportTickets(),
        fetchAdminAuditLogs(),
        fetchAdminBannedIps()
      ]);
      setOverview(overviewData);
      setUsers(userData);
      setQuestions(questionData);
      setComments(commentData);
      setMessages(messageData);
      setFriendships(friendshipData);
      setSettings(settingsData);
      setUsageMetrics(usageData);
      setApiKeys(apiKeyData);
      setSupportTickets(supportData);
      setAuditLogs(auditData);
      setBannedIps(bannedIpData);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err, 'Admin verileri yüklenirken hata oluştu.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const questionStatusSummary = useMemo<Array<{ status: string; count: number }>>(() => {
    if (!overview?.questions) return [];
    return Object.entries(overview.questions as Record<string, number>).map(([status, count]) => ({
      status,
      count: Number(count)
    }));
  }, [overview]);

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await updateAdminUserRole(userId, role);
      await loadData();
    } catch (err) {
      setError(extractErrorMessage(err, 'Kullanıcı rolü güncellenemedi.'));
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Kullanıcıyı silmek istediğinize emin misiniz?')) return;
    try {
      await deleteAdminUser(userId);
      await loadData();
    } catch (err) {
      setError(extractErrorMessage(err, 'Kullanıcı silinemedi.'));
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Soruyu silmek istediğinize emin misiniz?')) return;
    try {
      await deleteAdminQuestion(questionId);
      await loadData();
    } catch (err) {
      setError(extractErrorMessage(err, 'Soru silinemedi.'));
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Yorumu silmek istediğinize emin misiniz?')) return;
    try {
      await deleteAdminComment(commentId);
      await loadData();
    } catch (err) {
      setError(extractErrorMessage(err, 'Yorum silinemedi.'));
    }
  };

  const handleFlagMessage = async (messageId: string, isSpam: boolean) => {
    try {
      await flagAdminMessage(messageId, isSpam);
      await loadData();
    } catch (err) {
      setError(extractErrorMessage(err, 'Mesaj güncellenemedi.'));
    }
  };

  const handleSanction = async (userId: string, mode: 'BAN' | 'SHADOW') => {
    try {
      setSanctionLoading(`${userId}-${mode}`);
      const reasonInput = window.prompt('Yaptırım nedeni (isteğe bağlı):') ?? undefined;
      let expiresAt: string | undefined;

      if (mode === 'BAN') {
        const daysInput = window.prompt('Ban süresi (gün cinsinden, kalıcı için boş bırakın):');
        if (daysInput) {
          const days = Number(daysInput);
          if (Number.isFinite(days) && days > 0) {
            const expiry = new Date();
            expiry.setDate(expiry.getDate() + days);
            expiresAt = expiry.toISOString();
          }
        }
      }

      await sanctionAdminUser(userId, {
        mode,
        reason: reasonInput && reasonInput.trim().length > 0 ? reasonInput : undefined,
        expiresAt
      });
      await loadData();
    } catch (err) {
      setError(extractErrorMessage(err, 'Yaptırım uygulanamadı.'));
    } finally {
      setSanctionLoading(null);
    }
  };

  const handleLiftSanction = async (userId: string, mode: 'BAN' | 'SHADOW') => {
    try {
      setSanctionLoading(`${userId}-${mode}-lift`);
      await liftAdminSanction(userId, mode);
      await loadData();
    } catch (err) {
      setError(extractErrorMessage(err, 'Yaptırım kaldırılamadı.'));
    } finally {
      setSanctionLoading(null);
    }
  };

  const handleIpBanSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (!ipBanForm.ipAddress.trim()) {
        setError('IP adresi boş bırakılamaz.');
        return;
      }

      await createAdminBannedIp({
        ipAddress: ipBanForm.ipAddress.trim(),
        reason: ipBanForm.reason.trim() ? ipBanForm.reason.trim() : undefined,
        expiresAt: ipBanForm.expiresAt ? new Date(ipBanForm.expiresAt).toISOString() : undefined
      });
      setIpBanForm({ ipAddress: '', reason: '', expiresAt: '' });
      await loadData();
    } catch (err) {
      setError(extractErrorMessage(err, 'IP engeli uygulanamadı.'));
    }
  };

  const handleRemoveIpBan = async (ipId: string) => {
    try {
      await deleteAdminBannedIp(ipId);
      await loadData();
    } catch (err) {
      setError(extractErrorMessage(err, 'IP engeli kaldırılamadı.'));
    }
  };

  const handleSettingChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      await updateAdminSettings(Object.entries(settings).map(([key, value]) => ({ key, value })));
      await loadData();
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err, 'Ayarlar kaydedilemedi.'));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleApiKeyFormChange = (field: 'provider' | 'key' | 'priority', value: string) => {
    setApiKeyForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateApiKey = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await createAdminApiKey({
        provider: apiKeyForm.provider,
        key: apiKeyForm.key,
        priority: apiKeyForm.priority ? Number(apiKeyForm.priority) : undefined
      });
      setApiKeyForm({ provider: 'GEMINI', key: '', priority: '' });
      await loadData();
    } catch (err) {
      setError(extractErrorMessage(err, 'API anahtarı eklenemedi.'));
    }
  };

  const handleToggleApiKey = async (keyId: string, isActive: boolean) => {
    try {
      await updateAdminApiKey(keyId, { isActive });
      await loadData();
    } catch (err) {
      setError(extractErrorMessage(err, 'API anahtarı güncellenemedi.'));
    }
  };

  const handlePriorityUpdate = async (keyId: string, priority: number) => {
    try {
      await updateAdminApiKey(keyId, { priority });
      await loadData();
    } catch (err) {
      setError(extractErrorMessage(err, 'Öncelik güncellenemedi.'));
    }
  };

  const handleGenerateImagen = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!imagenPrompt.trim()) {
      return;
    }

    try {
      setImagenLoading(true);
      const result = await generateImagenPreview({ prompt: imagenPrompt.trim(), count: 2 });
      setImagenPreview(result);
      setImagenPrompt('');
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err, 'Imagen çıktısı alınamadı.'));
    } finally {
      setImagenLoading(false);
    }
  };

  const renderOverview = () => (
    <div className="admin-grid">
      <div className="card admin-card">
        <h3>Kullanıcılar</h3>
        <p>Öğrenciler: {overview?.users?.students ?? 0}</p>
        <p>Öğretmenler: {overview?.users?.teachers ?? 0}</p>
        <p>Adminler: {overview?.users?.admins ?? 0}</p>
      </div>
      <div className="card admin-card">
        <h3>Soru Durumları</h3>
        {questionStatusSummary.length === 0 && <p>Veri yok.</p>}
        {questionStatusSummary.map((item) => (
          <p key={item.status}>
            {item.status}: {item.count}
          </p>
        ))}
      </div>
      <div className="card admin-card">
        <h3>Toplam yorum</h3>
        <p>{overview?.totalComments ?? 0}</p>
      </div>
      <div className="card admin-card">
        <h3>Toplam mesaj</h3>
        <p>{overview?.totalMessages ?? 0}</p>
      </div>
    </div>
  );

  const [newAccountForm, setNewAccountForm] = useState<{ username: string; password: string; role: 'STUDENT' | 'TEACHER' | 'ADMIN' }>({
    username: '',
    password: '',
    role: 'STUDENT'
  });
  const [bulkAccountText, setBulkAccountText] = useState('');
  const [bulkAccountRole, setBulkAccountRole] = useState<'STUDENT' | 'TEACHER' | 'ADMIN'>('STUDENT');
  const [newAccountLoading, setNewAccountLoading] = useState(false);
  const [newAccountSuccess, setNewAccountSuccess] = useState<string | null>(null);
  const [bulkAccountErrors, setBulkAccountErrors] = useState<string[]>([]);

  const handleCreateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setNewAccountLoading(true);
      setNewAccountSuccess(null);
      await createAdminAccount(newAccountForm);
      setNewAccountSuccess(`Hesap oluşturuldu: ${newAccountForm.username}`);
      setNewAccountForm({ username: '', password: '', role: 'STUDENT' });
      await loadData();
    } catch (err) {
      setError(extractErrorMessage(err, 'Hesap oluşturulamadı.'));
    } finally {
      setNewAccountLoading(false);
    }
  };

  const handleBulkCreateAccounts = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!bulkAccountText.trim()) return;

    const lines = bulkAccountText.split('\n').map(l => l.trim()).filter(Boolean);
    const accounts = lines.map(line => {
      const parts = line.split(/[\s,]+/);
      return {
        username: parts[0] || '',
        password: parts[1] || parts[0] || '12345678', // Use username as default password if missing
        role: bulkAccountRole
      };
    }).filter(a => a.username.length > 0);

    if (accounts.length === 0) return;

    try {
      setNewAccountLoading(true);
      setNewAccountSuccess(null);
      setBulkAccountErrors([]);
      const result = await createAdminAccountsBulk(accounts);
      if (result.results.length > 0) {
        setNewAccountSuccess(`Başarıyla ${result.results.length} hesap oluşturuldu.`);
        setBulkAccountText('');
      }
      if (result.errors.length > 0) {
        setBulkAccountErrors(result.errors);
      }
      await loadData();
    } catch (err) {
      setError(extractErrorMessage(err, 'Toplu hesap oluşturulamadı.'));
    } finally {
      setNewAccountLoading(false);
    }
  };

  const renderUsers = () => (
    <div>
      <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', marginBottom: '2rem' }}>
        {/* Single account creation form */}
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.06), rgba(59,130,246,0.04))', border: '1px solid rgba(139,92,246,0.12)' }}>
          <h3>🔑 Yeni hesap oluştur</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Kullanıcı adı ve şifre belirleyerek yeni hesap oluşturun. Kullanıcı ilk girişte profilini tamamlar.
          </p>
          {newAccountSuccess && bulkAccountErrors.length === 0 && (
            <p style={{ color: '#047857', marginBottom: '0.75rem', fontSize: '0.9rem', fontWeight: 500 }}>✓ {newAccountSuccess}</p>
          )}
          <form onSubmit={handleCreateAccount} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="form-group">
              <label>Kullanıcı adı</label>
              <input
                className="input"
                required
                placeholder="kullanici_adi"
                value={newAccountForm.username}
                onChange={(e) => setNewAccountForm(prev => ({ ...prev, username: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Şifre</label>
              <input
                className="input"
                type="password"
                required
                minLength={8}
                placeholder="Min 8 karakter"
                value={newAccountForm.password}
                onChange={(e) => setNewAccountForm(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Rol</label>
              <select
                className="input"
                value={newAccountForm.role}
                onChange={(e) => setNewAccountForm(prev => ({ ...prev, role: e.target.value as 'STUDENT' | 'TEACHER' | 'ADMIN' }))}
              >
                {ROLE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <button className="button" type="submit" disabled={newAccountLoading}>
              {newAccountLoading ? 'Oluşturuluyor...' : 'Hesap oluştur'}
            </button>
          </form>
        </div>

        {/* Bulk account creation form */}
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(59,130,246,0.04))', border: '1px solid rgba(16,185,129,0.12)' }}>
          <h3>👥 Toplu hesap oluştur</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Her satıra bir kullanıcı adı ve şifre yazın (virgül veya boşlukla ayırın). Şifre yazılmazsa kullanıcı adı şifre olarak belirlenir.
          </p>
          {bulkAccountErrors.length > 0 && (
            <div style={{ background: 'rgba(239,68,68,0.1)', color: '#b91c1c', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
              <strong>Bazı hatalar oluştu:</strong>
              <ul style={{ margin: '0.5rem 0 0 1rem', padding: 0 }}>
                {bulkAccountErrors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}
          <form onSubmit={handleBulkCreateAccounts} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="form-group">
              <label>Kullanıcılar (kullanici_adi sifre)</label>
              <textarea
                className="input"
                required
                rows={5}
                placeholder="ogr1 ogr1_sifre
ogr2 ogr2_sifre
ogr3"
                value={bulkAccountText}
                onChange={(e) => setBulkAccountText(e.target.value)}
                style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
              />
            </div>
            <div className="form-group">
              <label>Toplu Rol Ataması</label>
              <select
                className="input"
                value={bulkAccountRole}
                onChange={(e) => setBulkAccountRole(e.target.value as 'STUDENT' | 'TEACHER' | 'ADMIN')}
              >
                {ROLE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <button className="button" type="submit" disabled={newAccountLoading}>
              {newAccountLoading ? 'Oluşturuluyor...' : 'Toplu Hesapları Oluştur'}
            </button>
          </form>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Ad Soyad</th>
              <th>Kullanıcı adı</th>
              <th>E-posta</th>
              <th>Rol</th>
              <th>Son Etkinlik</th>
              <th>Güvenlik</th>
              <th>Kayıt Tarihi</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  {user.firstName} {user.lastName}
                </td>
                <td>{user.username ?? '-'}</td>
                <td>{user.email}</td>
                <td>
                  <select value={user.role} onChange={(event) => handleRoleChange(user.id, event.target.value)}>
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <div>{user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleString('tr-TR') : '-'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    IP: {user.lastSeenIp ?? '-'}
                  </div>
                  {user.lastSeenUserAgent && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      UA: {user.lastSeenUserAgent.slice(0, 42)}
                      {user.lastSeenUserAgent.length > 42 ? '…' : ''}
                    </div>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {user.isBanned ? (
                      <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.18)', color: '#b91c1c' }}>
                        Banlı
                      </span>
                    ) : (
                      <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#047857' }}>
                        Aktif
                      </span>
                    )}
                    {user.shadowBanned && (
                      <span className="badge" style={{ background: 'rgba(251, 191, 36, 0.2)', color: '#b45309' }}>
                        Shadow ban
                      </span>
                    )}
                    {user.banReason && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sebep: {user.banReason}</div>
                    )}
                    {user.banExpiresAt && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Bitiş: {new Date(user.banExpiresAt).toLocaleString('tr-TR')}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      <button
                        className="button secondary"
                        type="button"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                        disabled={sanctionLoading === `${user.id}-BAN`}
                        onClick={() => handleSanction(user.id, 'BAN')}
                      >
                        Ban
                      </button>
                      <button
                        className="button secondary"
                        type="button"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                        disabled={sanctionLoading === `${user.id}-SHADOW`}
                        onClick={() => handleSanction(user.id, 'SHADOW')}
                      >
                        Shadow
                      </button>
                      {user.isBanned && (
                        <button
                          className="button secondary"
                          type="button"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                          disabled={sanctionLoading === `${user.id}-BAN-lift`}
                          onClick={() => handleLiftSanction(user.id, 'BAN')}
                        >
                          Banı kaldır
                        </button>
                      )}
                      {user.shadowBanned && (
                        <button
                          className="button secondary"
                          type="button"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                          disabled={sanctionLoading === `${user.id}-SHADOW-lift`}
                          onClick={() => handleLiftSanction(user.id, 'SHADOW')}
                        >
                          Shadow kaldır
                        </button>
                      )}
                    </div>
                  </div>
                </td>
                <td>{new Date(user.createdAt).toLocaleString('tr-TR')}</td>
                <td>
                  <button className="button secondary" type="button" onClick={() => handleDeleteUser(user.id)}>
                    Sil
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderQuestions = () => (
    <div className="table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Başlık</th>
            <th>Sahibi</th>
            <th>Durum</th>
            <th>Yanıt Sayısı</th>
            <th>İşlemler</th>
          </tr>
        </thead>
        <tbody>
          {questions.map((question) => (
            <tr key={question.id}>
              <td>{question.title}</td>
              <td>
                {question.student?.firstName} {question.student?.lastName}
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{question.student?.email}</div>
              </td>
              <td>{question.status}</td>
              <td>{question.answers?.length ?? 0}</td>
              <td>
                <button className="button secondary" type="button" onClick={() => handleDeleteQuestion(question.id)}>
                  Sil
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderComments = () => (
    <div className="table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Yorum</th>
            <th>Yazar</th>
            <th>Yanıt ID</th>
            <th>Tarih</th>
            <th>İşlemler</th>
          </tr>
        </thead>
        <tbody>
          {comments.map((comment) => (
            <tr key={comment.id}>
              <td>{comment.content}</td>
              <td>
                {comment.author.firstName} {comment.author.lastName}
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{comment.author.email}</div>
              </td>
              <td>{comment.answer.questionId}</td>
              <td>{new Date(comment.createdAt).toLocaleString('tr-TR')}</td>
              <td>
                <button className="button secondary" type="button" onClick={() => handleDeleteComment(comment.id)}>
                  Sil
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderMessages = () => (
    <div className="table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Gönderen</th>
            <th>Alıcı</th>
            <th>Mesaj</th>
            <th>Tarih</th>
            <th>Spam</th>
          </tr>
        </thead>
        <tbody>
          {messages.map((message) => (
            <tr key={message.id}>
              <td>
                {message.sender.firstName} {message.sender.lastName}
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{message.sender.email}</div>
              </td>
              <td>
                {message.receiver.firstName} {message.receiver.lastName}
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{message.receiver.email}</div>
              </td>
              <td>{message.content}</td>
              <td>{new Date(message.createdAt).toLocaleString('tr-TR')}</td>
              <td>
                <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(message.isSpam)}
                    onChange={(event) => handleFlagMessage(message.id, event.target.checked)}
                  />
                  Spam olarak işaretle
                </label>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderFriendships = () => (
    <div className="table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            <th>İstek Sahibi</th>
            <th>Karşı Taraf</th>
            <th>Durum</th>
            <th>Tarih</th>
          </tr>
        </thead>
        <tbody>
          {friendships.map((fr) => (
            <tr key={fr.id}>
              <td>
                {fr.requester.firstName} {fr.requester.lastName}
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fr.requester.email}</div>
              </td>
              <td>
                {fr.addressee.firstName} {fr.addressee.lastName}
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fr.addressee.email}</div>
              </td>
              <td>{fr.status}</td>
              <td>{new Date(fr.createdAt).toLocaleString('tr-TR')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderSettings = () => (
    <div className="settings-grid">
      <div className="form-group">
        <label htmlFor="system-prompt">Sistem promptu</label>
        <textarea
          id="system-prompt"
          className="input"
          rows={6}
          value={settings.SYSTEM_PROMPT ?? ''}
          onChange={(event) => handleSettingChange('SYSTEM_PROMPT', event.target.value)}
        />
      </div>
      <div className="form-group">
        <label htmlFor="support-prompt">Destek botu promptu</label>
        <textarea
          id="support-prompt"
          className="input"
          rows={5}
          value={settings.SUPPORT_PROMPT ?? ''}
          onChange={(event) => handleSettingChange('SUPPORT_PROMPT', event.target.value)}
        />
      </div>
      <div className="settings-grid-inline">
        <div className="form-group">
          <label>Bakım modu</label>
          <select
            value={settings.MAINTENANCE_MODE ?? 'OFF'}
            onChange={(event) => handleSettingChange('MAINTENANCE_MODE', event.target.value)}
          >
            <option value="OFF">Kapalı</option>
            <option value="ON">Açık</option>
          </select>
        </div>
        <div className="form-group">
          <label>Aktif AI modeli</label>
          <input
            type="text"
            value={settings.ACTIVE_AI_MODEL ?? ''}
            onChange={(event) => handleSettingChange('ACTIVE_AI_MODEL', event.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Uygulama testi modeli</label>
          <input
            type="text"
            value={settings.ACTIVE_PRACTICE_MODEL ?? ''}
            onChange={(event) => handleSettingChange('ACTIVE_PRACTICE_MODEL', event.target.value)}
          />
        </div>
      </div>
      <div className="settings-grid-inline">
        <div className="form-group">
          <label>Destek modeli</label>
          <input
            type="text"
            value={settings.ACTIVE_SUPPORT_MODEL ?? ''}
            onChange={(event) => handleSettingChange('ACTIVE_SUPPORT_MODEL', event.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Etik modeli</label>
          <input
            type="text"
            value={settings.ACTIVE_ETHICS_MODEL ?? ''}
            onChange={(event) => handleSettingChange('ACTIVE_ETHICS_MODEL', event.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Moderasyon modeli</label>
          <input
            type="text"
            value={settings.ACTIVE_MODERATION_MODEL ?? ''}
            onChange={(event) => handleSettingChange('ACTIVE_MODERATION_MODEL', event.target.value)}
          />
        </div>
      </div>
      <button
        className="button"
        type="button"
        onClick={() => {
          void handleSaveSettings();
        }}
        disabled={savingSettings}
      >
        {savingSettings ? 'Kaydediliyor...' : 'Ayarları kaydet'}
      </button>
    </div>
  );

  const renderUsage = () => {
    const totals = usageMetrics?.totals ?? {};
    const events = usageMetrics?.recent ?? [];

    const formatContext = (value: string | null) => {
      if (!value) return '-';
      try {
        const parsed = JSON.parse(value);
        return JSON.stringify(parsed, null, 0).slice(0, 120);
      } catch (error) {
        return value.slice(0, 120);
      }
    };

    return (
      <div className="usage-grid">
        <div className="card admin-card">
          <h3>Son 7 gün kullanım</h3>
          {Object.keys(totals).length === 0 && <p>Henüz kayıt yok.</p>}
          {Object.entries(totals).map(([eventType, count]) => (
            <p key={eventType}>
              {eventType}: <strong>{count}</strong>
            </p>
          ))}
        </div>
        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Olay</th>
                <th>Zaman</th>
                <th>Bağlam</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{event.eventType}</td>
                  <td>{new Date(event.createdAt).toLocaleString('tr-TR')}</td>
                  <td style={{ fontSize: '0.85rem' }}>{formatContext(event.context)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderApiKeys = () => (
    <div className="admin-api-keys">
      <form
        className="api-key-form"
        onSubmit={(event) => {
          void handleCreateApiKey(event);
        }}
      >
        <h3>Yeni API anahtarı ekle</h3>
        <div className="form-row">
          <label htmlFor="api-provider">Sağlayıcı</label>
          <select
            id="api-provider"
            value={apiKeyForm.provider}
            onChange={(event) => handleApiKeyFormChange('provider', event.target.value as 'GEMINI' | 'IMAGEN')}
          >
            <option value="GEMINI">Gemini</option>
            <option value="IMAGEN">Imagen</option>
          </select>
        </div>
        <div className="form-row">
          <label htmlFor="api-key">Anahtar</label>
          <input
            id="api-key"
            type="text"
            value={apiKeyForm.key}
            onChange={(event) => handleApiKeyFormChange('key', event.target.value)}
            required
          />
        </div>
        <div className="form-row">
          <label htmlFor="api-priority">Öncelik</label>
          <input
            id="api-priority"
            type="number"
            min={0}
            value={apiKeyForm.priority}
            onChange={(event) => handleApiKeyFormChange('priority', event.target.value)}
          />
        </div>
        <button className="button" type="submit">
          Anahtarı ekle
        </button>
      </form>

      <div className="table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Sağlayıcı</th>
              <th>Öncelik</th>
              <th>Durum</th>
              <th>Hata sayısı</th>
              <th>Son kullanım</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {apiKeys.map((key) => (
              <tr key={key.id}>
                <td>{key.provider}</td>
                <td>
                  <input
                    type="number"
                    value={key.priority}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setApiKeys((prev) =>
                        prev.map((item) =>
                          item.id === key.id
                            ? {
                              ...item,
                              priority: Number.isFinite(value) ? value : item.priority
                            }
                            : item
                        )
                      );
                    }}
                    onBlur={(event) => {
                      const value = Number(event.target.value);
                      if (Number.isFinite(value)) {
                        void handlePriorityUpdate(key.id, value);
                      }
                    }}
                    style={{ width: '4rem' }}
                  />
                </td>
                <td>
                  <span className={key.isActive ? 'badge' : 'badge outline'}>
                    {key.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                </td>
                <td>{key.failCount ?? 0}</td>
                <td>{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString('tr-TR') : '-'}</td>
                <td>
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() => handleToggleApiKey(key.id, !key.isActive)}
                  >
                    {key.isActive ? 'Devre dışı bırak' : 'Aktifleştir'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="card">
        <h3>Imagen test üretimi</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Prompt girerek Imagen modelinden örnek görseller üretebilirsiniz. Bu işlem kayıt altına alınır ve
          destek ekibine gösterilir.
        </p>
        <form
          className="imagen-form"
          onSubmit={(event) => {
            void handleGenerateImagen(event);
          }}
        >
          <textarea
            className="input"
            rows={3}
            placeholder="Örnek: Robot holding a red skateboard"
            value={imagenPrompt}
            onChange={(event) => setImagenPrompt(event.target.value)}
            required
          />
          <button className="button" type="submit" disabled={imagenLoading}>
            {imagenLoading ? 'Oluşturuluyor...' : 'Görsel üret'}
          </button>
        </form>
        {imagenPreview && imagenPreview.images.length > 0 && (
          <div className="attachment-grid" style={{ marginTop: '1rem' }}>
            {imagenPreview.images.map((image) => (
              <div key={image.index} className="attachment-card">
                <img
                  src={`data:${image.mimeType};base64,${image.base64}`}
                  alt={`Imagen ${image.index + 1}`}
                  loading="lazy"
                />
                <span>{(image.sizeBytes / 1024).toFixed(1)} KB</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );

  const renderSupport = () => (
    <div className="table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Ticket</th>
            <th>Durum</th>
            <th>Mesaj Sayısı</th>
            <th>Son Güncelleme</th>
            <th>Son Mesaj</th>
          </tr>
        </thead>
        <tbody>
          {supportTickets.map((ticket) => (
            <tr key={ticket.id}>
              <td>{ticket.id}</td>
              <td>{ticket.status}</td>
              <td>{ticket._count?.messages ?? 0}</td>
              <td>{new Date(ticket.updatedAt).toLocaleString('tr-TR')}</td>
              <td style={{ maxWidth: '18rem' }}>
                {ticket.messages[0]?.content ?? '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderSecurity = () => (
    <div className="security-grid">
      <section className="card">
        <span className="badge">IP Engeli</span>
        <h3>IP adresini engelle</h3>
        <p style={{ color: 'var(--text-muted)' }}>
          Zararlı trafik tespit ettiğiniz IP adreslerini geçici veya kalıcı olarak engelleyebilirsiniz.
        </p>
        <form className="ip-ban-form" onSubmit={handleIpBanSubmit}>
          <div className="form-group">
            <label htmlFor="ip-address">IP adresi</label>
            <input
              id="ip-address"
              className="input"
              value={ipBanForm.ipAddress}
              onChange={(event) => setIpBanForm((prev) => ({ ...prev, ipAddress: event.target.value }))}
              placeholder="Örn: 192.168.1.15"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="ip-reason">Not</label>
            <input
              id="ip-reason"
              className="input"
              value={ipBanForm.reason}
              onChange={(event) => setIpBanForm((prev) => ({ ...prev, reason: event.target.value }))}
              placeholder="İsteğe bağlı açıklama"
            />
          </div>
          <div className="form-group">
            <label htmlFor="ip-expiry">Bitiş tarihi</label>
            <input
              id="ip-expiry"
              className="input"
              type="date"
              value={ipBanForm.expiresAt}
              onChange={(event) => setIpBanForm((prev) => ({ ...prev, expiresAt: event.target.value }))}
            />
          </div>
          <div className="ip-ban-actions">
            <button className="button" type="submit">
              IP engelle
            </button>
            <button
              className="button secondary"
              type="button"
              onClick={() => setIpBanForm({ ipAddress: '', reason: '', expiresAt: '' })}
            >
              Temizle
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <h3>Aktif IP engelleri</h3>
        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>IP</th>
                <th>Not</th>
                <th>Oluşturulma</th>
                <th>Bitiş</th>
                <th>Ekleyen</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {bannedIps.map((item) => (
                <tr key={item.id}>
                  <td>{item.ipAddress}</td>
                  <td>{item.reason ?? '-'}</td>
                  <td>{new Date(item.createdAt).toLocaleString('tr-TR')}</td>
                  <td>{item.expiresAt ? new Date(item.expiresAt).toLocaleString('tr-TR') : 'Süresiz'}</td>
                  <td>
                    {item.createdBy
                      ? `${item.createdBy.firstName} ${item.createdBy.lastName}`
                      : '-'}
                  </td>
                  <td>
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() => handleRemoveIpBan(item.id)}
                    >
                      Kaldır
                    </button>
                  </td>
                </tr>
              ))}
              {bannedIps.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Aktif IP engeli yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h3>Kullanıcı işlem kayıtları</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Son 50 istek kaydı kullanıcı ve IP bilgileri ile birlikte görüntülenir.
        </p>
        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Zaman</th>
                <th>Kullanıcı</th>
                <th>Yol</th>
                <th>IP</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.createdAt).toLocaleString('tr-TR')}</td>
                  <td>
                    {log.user
                      ? `${log.user.firstName} ${log.user.lastName} (${log.user.email})`
                      : 'Anonim'}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{log.method ?? 'GET'}</span> {log.path}
                  </td>
                  <td>{log.ipAddress ?? '-'}</td>
                  <td>{log.statusCode ?? '-'}</td>
                </tr>
              ))}
              {auditLogs.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Kayıt bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );

  const renderActiveTab = (): ReactNode => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'users':
        return renderUsers();
      case 'questions':
        return renderQuestions();
      case 'comments':
        return renderComments();
      case 'messages':
        return renderMessages();
      case 'friendships':
        return renderFriendships();
      case 'settings':
        return renderSettings();
      case 'usage':
        return renderUsage();
      case 'apiKeys':
        return renderApiKeys();
      case 'security':
        return renderSecurity();
      case 'support':
        return renderSupport();
      default:
        return null;
    }
  };

  return (
    <>
      {loading && <LoadingOverlay fullscreen message="Admin verileri yükleniyor..." />}
      <section className="card" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <span className="badge">Admin Paneli</span>
        <h1>Platform yönetimi</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Kundiva içinde gerçekleşen tüm etkileşimleri görüntüleyin, gerekirse düzenleyin ve spam bildirimlerini yönetin.
        </p>
        <div className="admin-tabs">
          <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>
            Özet
          </button>
          <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>
            Kullanıcılar
          </button>
          <button className={activeTab === 'questions' ? 'active' : ''} onClick={() => setActiveTab('questions')}>
            Sorular
          </button>
          <button className={activeTab === 'comments' ? 'active' : ''} onClick={() => setActiveTab('comments')}>
            Yorumlar
          </button>
          <button className={activeTab === 'messages' ? 'active' : ''} onClick={() => setActiveTab('messages')}>
            Mesajlar
          </button>
          <button className={activeTab === 'friendships' ? 'active' : ''} onClick={() => setActiveTab('friendships')}>
            Arkadaşlıklar
          </button>
          <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>
            Ayarlar
          </button>
          <button className={activeTab === 'usage' ? 'active' : ''} onClick={() => setActiveTab('usage')}>
            Kullanım
          </button>
          <button className={activeTab === 'apiKeys' ? 'active' : ''} onClick={() => setActiveTab('apiKeys')}>
            API Anahtarları
          </button>
          <button className={activeTab === 'security' ? 'active' : ''} onClick={() => setActiveTab('security')}>
            Güvenlik
          </button>
          <button className={activeTab === 'support' ? 'active' : ''} onClick={() => setActiveTab('support')}>
            Destek Geçmişi
          </button>
        </div>
        {loading ? <LoadingOverlay subtle message="Veriler güncelleniyor..." /> : renderActiveTab()}
        {error && <p style={{ color: 'var(--danger)', marginTop: '1rem' }}>{error}</p>}
      </section>
    </>
  );
};
