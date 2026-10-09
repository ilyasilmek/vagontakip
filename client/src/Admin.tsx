import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, Check, ClipboardList, Plus, RefreshCw, ShieldCheck, Trash2, Users } from 'lucide-react';
import { POSTS, type Post } from '../../shared/types';
import type { AuditEvent, SafeUser, UserRole } from '../../shared/types';
import { api, ApiError } from './api';
import Modal from './Modal';
import { formatDate } from './records';

export function initials(name: string): string { return name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('').toLocaleUpperCase('tr-TR'); }
const entityNames: Record<string, string> = { wagon: 'Vagon', part: 'Parça', inventory: 'Demirbaş', user: 'Kullanıcı', system: 'Sistem', maintenance: 'Bakım operasyonu' };
const actionNames: Record<string, string> = { create: 'eklendi', update: 'güncellendi', delete: 'silindi', login: 'giriş yaptı', password_change: 'şifre değiştirildi', password: 'şifre değiştirildi', bootstrap: 'kurulum tamamlandı' };

export default function Admin({ online, onExpired, notify }: { online: boolean; onExpired: () => void; notify: (message: string) => void }) {
  const [tab, setTab] = useState<'users' | 'audit'>('users');
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState<{ user: SafeUser | null } | null>(null);
  const load = useCallback(async () => {
    if (!online) return;
    setLoading(true); setError('');
    try {
      if (tab === 'users') setUsers((await api<{ users: SafeUser[] }>('/admin/users')).users);
      else setEvents((await api<{ events: AuditEvent[] }>('/admin/audit')).events);
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) { onExpired(); return; }
      setError(reason instanceof Error ? reason.message : 'Yönetim bilgileri alınamadı.');
    } finally { setLoading(false); }
  }, [online, tab, onExpired]);
  useEffect(() => { void load(); }, [load]);
  return <>
    <div className="page-heading"><div><h1>Yönetim</h1><p>Ekibinizin erişimini ve kayıt geçmişini yönetin.</p></div><div className="heading-actions"><button className="secondary refresh-button" onClick={() => void load()} disabled={!online || loading} aria-label="Yönetim bilgilerini yenile"><RefreshCw className={loading ? 'spin' : ''} /> Yenile</button>{tab === 'users' && <button className="primary" onClick={() => setEditor({ user: null })} disabled={!online}><Plus /> Kullanıcı</button>}</div></div>
    <div className="admin-tabs"><button className={tab === 'users' ? 'primary' : 'secondary'} onClick={() => setTab('users')}><Users /> Kullanıcılar</button><button className={tab === 'audit' ? 'primary' : 'secondary'} onClick={() => setTab('audit')}><ClipboardList /> İşlem geçmişi</button></div>
    {!online && <div className="notice"><AlertTriangle /><span>Yönetim sayfası için internet bağlantısı gerekiyor.</span></div>}
    {error && <div className="notice error" role="alert"><AlertTriangle /><span>{error}</span></div>}
    {loading && !users.length && !events.length ? <div className="empty-state"><RefreshCw className="spin" /><p>Yönetim bilgileri alınıyor…</p></div> : tab === 'users' ? <div className="user-grid">{users.map(user => <div key={user.id} className="user-card" role="button" tabIndex={0} onClick={() => setEditor({ user })} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setEditor({ user }); } }}><div className="user-card-top"><div className="avatar">{initials(user.displayName)}</div><span className={`badge ${user.active ? 'teal' : 'red'}`}>{user.active ? 'Aktif' : 'Pasif'}</span></div><h3>{user.displayName}</h3><p>@{user.username} · {user.post || 'Postası belirtilmemiş'}</p><div className="user-card-bottom"><span>{user.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}</span><span>{user.role === 'admin' && <ShieldCheck size={14} />}</span></div></div>)}</div> : <div className="panel"><ul className="audit-list">{[...events].sort((a, b) => b.at.localeCompare(a.at)).map(event => <li key={event.id} className="audit-row"><div className="activity-icon"><ClipboardList /></div><div><p><strong>{event.actorName}</strong> · {entityNames[event.entity] || event.entity} {actionNames[event.action] || event.action}</p>{event.details && <small>{event.details}</small>}</div><time dateTime={event.at}>{formatDate(event.at, true)}</time></li>)}</ul>{!events.length && <div className="empty-state"><ClipboardList /><h3>İşlem geçmişi boş</h3><p>Ekibinizin yaptığı işlemler burada görünür.</p></div>}</div>}
    {editor && <UserEditor user={editor.user} online={online} onClose={() => setEditor(null)} onExpired={onExpired} onSaved={async message => { setEditor(null); notify(message); await load(); }} />}
  </>;
}

function UserEditor({ user, online, onClose, onExpired, onSaved }: { user: SafeUser | null; online: boolean; onClose: () => void; onExpired: () => void; onSaved: (message: string) => Promise<void> }) {
  const [username, setUsername] = useState(user?.username || '');
  const [post, setPost] = useState<Post | ''>(user?.post || '');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [role, setRole] = useState<UserRole>(user?.role || 'user');
  const [active, setActive] = useState(user?.active ?? true);
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  function fail(reason: unknown) { if (reason instanceof ApiError && reason.status === 401) onExpired(); else setError(reason instanceof Error ? reason.message : 'Kullanıcı kaydedilemedi.'); }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!online || pending) return;
    setPending(true); setError('');
    try {
      await api(`/admin/users${user ? `/${encodeURIComponent(user.id)}` : ''}`, user ? 'PATCH' : 'POST', { displayName: displayName.trim(), post, role, ...(user ? { active, updatedAt: user.updatedAt } : { username: username.trim() }), ...(password ? { password } : {}) });
      setPassword(''); await onSaved(user ? 'Kullanıcı güncellendi.' : 'Kullanıcı oluşturuldu.');
    } catch (reason) { fail(reason); }
    finally { setPending(false); }
  }
  async function remove() {
    if (!user || !online || pending) return;
    setPending(true); setError('');
    try { await api(`/admin/users/${encodeURIComponent(user.id)}`, 'DELETE', { updatedAt: user.updatedAt }); await onSaved('Kullanıcı silindi.'); }
    catch (reason) { fail(reason); }
    finally { setPending(false); }
  }
  return <Modal title={user ? 'Kullanıcıyı düzenle' : 'Yeni kullanıcı'} subtitle={user ? `@${user.username}` : 'Ekibiniz için giriş hesabı oluşturun.'} onClose={() => { if (!pending) onClose(); }} canClose={!pending} footer={<><button className="secondary" onClick={onClose} disabled={pending}>Vazgeç</button>{user && <button className="danger-button" onClick={() => setDeleting(true)} disabled={pending || !online}><Trash2 /> Sil</button>}<button className="primary" type="submit" form="user-form" disabled={pending || !online}>{pending ? <RefreshCw className="spin" /> : <Check />} Kaydet</button></>}>
    {error && <div className="notice error" role="alert"><AlertTriangle /><span>{error}</span></div>}<form id="user-form" onSubmit={save}><div className="form-grid"><label>Ad soyad<input value={displayName} onChange={event => setDisplayName(event.target.value)} required maxLength={100} disabled={pending} autoComplete="off" /></label><label>Kullanıcı adı<input value={username} onChange={event => setUsername(event.target.value)} required minLength={3} maxLength={64} disabled={!!user || pending} autoCapitalize="none" spellCheck={false} autoComplete="off" /><span className="field-hint">{user ? 'Kullanıcı adı değiştirilemez.' : 'Türkçe harfler kullanılabilir; boşluk kullanmayın.'}</span></label><label htmlFor="user-post">Postası<select id="user-post" aria-label="Postası" value={post} onChange={event => setPost(event.target.value as Post | '')} disabled={pending}><option value="">Seçiniz</option>{POSTS.map(option => <option key={option}>{option}</option>)}</select></label><label>Yetki<select value={role} onChange={event => setRole(event.target.value as UserRole)} disabled={pending}><option value="user">Kullanıcı</option><option value="admin">Yönetici</option></select></label>{user && <label>Hesap durumu<select value={active ? 'active' : 'inactive'} onChange={event => setActive(event.target.value === 'active')} disabled={pending}><option value="active">Aktif</option><option value="inactive">Pasif</option></select></label>}<label className="full-width">{user ? 'Yeni şifre (isteğe bağlı)' : 'Şifre'}<input type="password" value={password} onChange={event => setPassword(event.target.value)} minLength={8} maxLength={256} required={!user} autoComplete="new-password" disabled={pending} /><span className="field-hint">En az 8 karakter.{user && ' Mevcut şifreyi korumak için boş bırakın.'}</span></label></div><p className="form-warning">Yöneticiler tüm kayıtları silebilir ve ekip hesaplarını yönetebilir. Pasif hesaplar uygulamaya giriş yapamaz.</p></form>{deleting && <div className="confirm-delete" role="alert"><h3>Kullanıcı silinsin mi?</h3><p>Bu hesabın uygulamaya erişimi kaldırılır. Daha önce eklediği kayıtlar korunur.</p><div className="confirm-actions"><button className="secondary" onClick={() => setDeleting(false)} disabled={pending}>Vazgeç</button><button className="danger-button" onClick={() => void remove()} disabled={pending || !online}><Trash2 /> Kullanıcıyı sil</button></div></div>}
  </Modal>;
}
