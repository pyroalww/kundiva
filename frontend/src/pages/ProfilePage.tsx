import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  fetchProfile, fetchProfileQuestions, fetchProfileSolutions, fetchProfilePosts,
  fetchFollowers, fetchFollowing, followUser, unfollowUser, updateBio,
  createPost, deletePost, type UserProfile, type UserPost
} from '../api/profile';
import { useAuth } from '../hooks/useAuth';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { extractErrorMessage } from '../utils/errorMessage';

type Tab = 'questions' | 'solutions' | 'posts' | 'followers' | 'following';

export const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('questions');

  const [questions, setQuestions] = useState<any[]>([]);
  const [solutions, setSolutions] = useState<any[]>([]);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  const [bioEdit, setBioEdit] = useState(false);
  const [bioText, setBioText] = useState('');
  const [followLoading, setFollowLoading] = useState(false);

  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [postLoading, setPostLoading] = useState(false);

  const isOwn = user?.username === username;

  const loadProfile = useCallback(async () => {
    if (!username) return;
    try {
      setLoading(true);
      const data = await fetchProfile(username);
      setProfile(data);
      setBioText(data.bio ?? '');
    } catch (err) {
      setError(extractErrorMessage(err, 'Profil yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => { void loadProfile(); }, [loadProfile]);

  useEffect(() => {
    if (!username) return;
    setTabLoading(true);
    const load = async () => {
      try {
        if (tab === 'questions') setQuestions(await fetchProfileQuestions(username));
        if (tab === 'solutions') setSolutions(await fetchProfileSolutions(username));
        if (tab === 'posts') setPosts(await fetchProfilePosts(username));
        if (tab === 'followers') setFollowers(await fetchFollowers(username));
        if (tab === 'following') setFollowing(await fetchFollowing(username));
      } catch {}
      setTabLoading(false);
    };
    void load();
  }, [tab, username]);

  const handleFollow = async () => {
    if (!username || !profile) return;
    setFollowLoading(true);
    try {
      if (profile.isFollowing) {
        await unfollowUser(username);
      } else {
        await followUser(username);
      }
      await loadProfile();
    } catch (err) {
      setError(extractErrorMessage(err, 'İşlem başarısız.'));
    } finally {
      setFollowLoading(false);
    }
  };

  const handleBioSave = async () => {
    try {
      await updateBio(bioText);
      setBioEdit(false);
      await loadProfile();
    } catch (err) {
      setError(extractErrorMessage(err, 'Biyografi kaydedilemedi.'));
    }
  };

  const handleCreatePost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) return;
    setPostLoading(true);
    try {
      await createPost(newPostTitle, newPostContent);
      setNewPostTitle('');
      setNewPostContent('');
      if (tab === 'posts' && username) setPosts(await fetchProfilePosts(username));
    } catch (err) {
      setError(extractErrorMessage(err, 'Gönderi oluşturulamadı.'));
    } finally {
      setPostLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Bu gönderiyi silmek istediğinize emin misiniz?')) return;
    try {
      await deletePost(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) {
      setError(extractErrorMessage(err, 'Gönderi silinemedi.'));
    }
  };

  const ROLE_LABELS: Record<string, string> = { STUDENT: 'Öğrenci', TEACHER: 'Öğretmen', ADMIN: 'Yönetici' };

  if (loading) return <LoadingOverlay fullscreen message="Profil yükleniyor..." />;
  if (!profile) return <div className="card"><p>Kullanıcı bulunamadı.</p></div>;

  return (
    <section>
      {error && <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</p>}

      {/* Profile header */}
      <div className="card fade-in-up" style={{ textAlign: 'center' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%', margin: '0 auto 1rem',
          background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem', fontWeight: 700, color: '#fff'
        }}>
          {profile.firstName[0]}{profile.lastName[0]}
        </div>
        <h1 style={{ marginBottom: '0.25rem' }}>{profile.firstName} {profile.lastName}</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          @{profile.username} • <span className="badge">{ROLE_LABELS[profile.role] ?? profile.role}</span>
        </p>

        {profile.bio && !bioEdit && (
          <p style={{ maxWidth: 500, margin: '0 auto 1rem', lineHeight: 1.6 }}>{profile.bio}</p>
        )}

        {isOwn && bioEdit && (
          <div style={{ maxWidth: 500, margin: '0 auto 1rem' }}>
            <textarea className="input" rows={3} value={bioText} onChange={e => setBioText(e.target.value)} placeholder="Biyografinizi yazın..." />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.5rem' }}>
              <button className="button" onClick={handleBioSave} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>Kaydet</button>
              <button className="button ghost" onClick={() => setBioEdit(false)} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>İptal</button>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap', margin: '1rem 0' }}>
          <div><strong>{profile._count.questions}</strong><br /><span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Soru</span></div>
          <div><strong>{profile.correctSolutions}</strong><br /><span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Çözüm</span></div>
          <div><strong>{profile._count.posts}</strong><br /><span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Gönderi</span></div>
          <div><strong>{profile._count.followers}</strong><br /><span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Takipçi</span></div>
          <div><strong>{profile._count.following}</strong><br /><span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Takip</span></div>
          <div><strong>{profile.totalPoints}</strong><br /><span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Puan</span></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
          {isOwn && (
            <button className="button ghost" onClick={() => setBioEdit(true)} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
              ✏️ Biyografi düzenle
            </button>
          )}
          {user && !isOwn && (
            <button
              className={`button ${profile.isFollowing ? 'secondary' : ''}`}
              onClick={handleFollow}
              disabled={followLoading}
              style={{ padding: '0.4rem 1.2rem', fontSize: '0.85rem' }}
            >
              {followLoading ? '...' : profile.isFollowing ? 'Takipten çık' : '+ Takip et'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', margin: '1.5rem 0 1rem', justifyContent: 'center' }}>
        {([['questions', '📚 Sorular'], ['solutions', '✅ Çözümler'], ['posts', '📝 Gönderiler'], ['followers', '👥 Takipçiler'], ['following', '🔗 Takip']] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            className={`button ${tab === key ? '' : 'ghost'}`}
            onClick={() => setTab(key)}
            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
          >
            {label}
          </button>
        ))}
      </div>

      {tabLoading && <LoadingOverlay message="Yükleniyor..." />}

      {/* Tab content */}
      {tab === 'questions' && !tabLoading && (
        <div>
          {questions.length === 0 && <div className="card"><p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Henüz soru yok.</p></div>}
          {questions.map((q: any) => (
            <Link key={q.id} to={`/questions/${q.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card" style={{ marginBottom: '0.75rem', cursor: 'pointer', transition: 'transform 0.15s' }}>
                <h3 style={{ marginBottom: '0.25rem' }}>{q.title}</h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {q.subjectName} • {q.course} • {new Date(q.createdAt).toLocaleDateString('tr-TR')}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {tab === 'solutions' && !tabLoading && (
        <div>
          {solutions.length === 0 && <div className="card"><p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Henüz çözüm yok.</p></div>}
          {solutions.map((s: any) => (
            <Link key={s.id} to={`/questions/${s.question?.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card" style={{ marginBottom: '0.75rem', cursor: 'pointer', borderLeft: s.isCorrect ? '4px solid rgba(16,185,129,0.5)' : s.isCorrect === false ? '4px solid rgba(239,68,68,0.3)' : undefined }}>
                <h4 style={{ marginBottom: '0.25rem' }}>{s.question?.title ?? 'Soru'}</h4>
                <p style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap', maxHeight: 100, overflow: 'hidden' }}>{s.content}</p>
                {s.isCorrect === true && <span className="badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#047857' }}>✓ Doğru</span>}
                {s.isCorrect === false && <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#b91c1c' }}>✗ Yanlış</span>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {tab === 'posts' && !tabLoading && (
        <div>
          {/* Post creation form for own profile */}
          {isOwn && (
            <div className="card" style={{ marginBottom: '1rem', background: 'linear-gradient(135deg, rgba(139,92,246,0.04), rgba(59,130,246,0.03))' }}>
              <h3 style={{ marginBottom: '0.75rem' }}>📝 Yeni gönderi paylaş</h3>
              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                <input className="input" placeholder="Başlık" value={newPostTitle} onChange={e => setNewPostTitle(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                <textarea className="input" rows={4} placeholder="İçerik (Markdown & LaTeX destekli)" value={newPostContent} onChange={e => setNewPostContent(e.target.value)} />
              </div>
              <button className="button" disabled={postLoading || !newPostTitle.trim() || !newPostContent.trim()} onClick={handleCreatePost}>
                {postLoading ? 'Paylaşılıyor...' : 'Paylaş'}
              </button>
            </div>
          )}

          {posts.length === 0 && <div className="card"><p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Henüz gönderi yok.</p></div>}
          {posts.map(post => (
            <div key={post.id} className="card fade-in-up" style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h3>{post.title}</h3>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(post.createdAt).toLocaleDateString('tr-TR')}
                  </span>
                  {(isOwn || user?.role === 'ADMIN') && (
                    <button className="button ghost" onClick={() => handleDeletePost(post.id)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>🗑</button>
                  )}
                </div>
              </div>
              <MarkdownRenderer content={post.content} />
            </div>
          ))}
        </div>
      )}

      {tab === 'followers' && !tabLoading && (
        <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {followers.length === 0 && <div className="card" style={{ gridColumn: '1 / -1' }}><p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Henüz takipçi yok.</p></div>}
          {followers.map((u: any) => (
            <Link key={u.id} to={`/profile/${u.username}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card" style={{ textAlign: 'center', cursor: 'pointer' }}>
                <strong>{u.firstName} {u.lastName}</strong>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>@{u.username}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {tab === 'following' && !tabLoading && (
        <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {following.length === 0 && <div className="card" style={{ gridColumn: '1 / -1' }}><p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Henüz takip yok.</p></div>}
          {following.map((u: any) => (
            <Link key={u.id} to={`/profile/${u.username}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card" style={{ textAlign: 'center', cursor: 'pointer' }}>
                <strong>{u.firstName} {u.lastName}</strong>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>@{u.username}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
};
