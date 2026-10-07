import { useState, type FormEvent } from 'react';
import { AlertTriangle, KeyRound, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import { POSTS, type Post, type SafeUser } from '../../shared/types';
import { api, ApiError } from './api';
import { initials } from './Admin';
import type { ThemePreference } from './theme';

export default function Account({ user, online, onLogout, onExpired, notify, onUpdated, theme, onThemeChange, startupAnimation, onStartupAnimationChange }: { startupAnimation: boolean; onStartupAnimationChange: (enabled: boolean) => void; theme: ThemePreference; onThemeChange: (theme: ThemePreference) => void; user: SafeUser; online: boolean; onLogout: () => Promise<void>; onExpired: () => void; notify: (message: string) => void; onUpdated: (user: SafeUser) => void }) {
  const [post, setPost] = useState<Post | ''>(user.post || '');
  const [postPending, setPostPending] = useState(false);
  const [postError, setPostError] = useState('');
  async function savePost(event: FormEvent) {
    event.preventDefault();
    if (postPending || !online) return;
    setPostPending(true); setPostError('');
    try { const result = await api<{ user: SafeUser }>('/account', 'PATCH', { post }); onUpdated(result.user); notify('Postanız kaydedildi.'); }
    catch (reason) { if (reason instanceof ApiError && reason.status === 401) onExpired(); else setPostError(reason instanceof Error ? reason.message : 'Postanız kaydedilemedi.'); }
    finally { setPostPending(false); }
  }
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function save(event: FormEvent) {
    event.preventDefault();
    if (pending || !online) return;
    if (password !== confirmPassword) { setError('Yeni şifreler eşleşmiyor.'); return; }
    setPending(true); setError('');
    try { await api('/password', 'POST', { currentPassword, password }); setCurrentPassword(''); setPassword(''); setConfirmPassword(''); notify('Şifreniz değiştirildi.'); }
    catch (reason) { if (reason instanceof ApiError && reason.status === 401) onExpired(); else setError(reason instanceof Error ? reason.message : 'Şifre değiştirilemedi.'); }
    finally { setPending(false); }
  }
  return <div className="account-section"><div className="page-heading"><div><h1>Hesabım</h1><p>Hesabınızı ve uygulama erişiminizi yönetin.</p></div></div><div className="panel account-panel"><div className="account-heading"><div className="avatar">{initials(user.displayName)}</div><div><h2>{user.displayName}</h2><p>@{user.username} · {user.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}</p></div></div><div className="account-theme"><label htmlFor="account-theme">Tema</label><select id="account-theme" value={theme} onChange={event => onThemeChange(event.target.value as ThemePreference)}><option value="system">Sistem</option><option value="light">Açık</option><option value="dark">Koyu</option></select><p className="field-hint">Sistem seçeneği cihazınızın tema ayarını takip eder.</p></div><div className="account-theme"><label htmlFor="account-startup-animation">Açılış animasyonu</label><select id="account-startup-animation" value={startupAnimation ? 'on' : 'off'} onChange={event => onStartupAnimationChange(event.target.value === 'on')}><option value="on">Açık</option><option value="off">Kapalı</option></select><p className="field-hint">Seçiminiz bu cihazda otomatik kaydedilir. Kapalıyken uygulama açılış animasyonunu atlayarak doğrudan açılır.</p></div><form onSubmit={savePost}><label htmlFor="account-post">Postası</label><select id="account-post" value={post} onChange={event => setPost(event.target.value as Post | '')} disabled={postPending || !online}><option value="">Seçiniz</option>{POSTS.map(option => <option key={option}>{option}</option>)}</select>{postError && <p className="notice error" role="alert">{postError}</p>}<div className="account-password-actions"><button className="primary" disabled={postPending || !online}>{postPending ? 'Kaydediliyor' : 'Postayı kaydet'}</button></div></form><div className="account-actions"><button className="danger-button" onClick={() => void onLogout()} disabled={!online}><LogOut /> Çıkış yap</button></div><p className="account-info">{user.role === 'admin' ? 'Tüm kayıtları düzenleyebilir, silebilir ve ekibinizin hesaplarını yönetebilirsiniz.' : 'Vagon, parça ve demirbaş kayıtları ekleyebilir ve düzenleyebilirsiniz. Silme işlemleri yöneticiniz tarafından yapılır.'}</p>{!online && <div className="notice"><AlertTriangle /><span>Çevrimdışı kopyayı görüntülüyorsunuz. Şifre değiştirmek ve oturumdan çıkmak için bağlanın.</span></div>}</div><div className="panel account-panel"><h3>Şifreyi değiştir</h3>{error && <div className="notice error" role="alert"><AlertTriangle /><span>{error}</span></div>}<form onSubmit={save}><div className="form-grid"><label className="full-width">Mevcut şifre<input type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} required autoComplete="current-password" disabled={pending || !online} maxLength={256} /></label><label>Yeni şifre<input type="password" value={password} onChange={event => setPassword(event.target.value)} required minLength={8} maxLength={256} autoComplete="new-password" disabled={pending || !online} /></label><label>Yeni şifre tekrar<input type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} required minLength={8} maxLength={256} autoComplete="new-password" disabled={pending || !online} /></label></div><div className="security-note"><ShieldCheck /><span>En az 8 karakter kullanın. Şifrenizi diğer kullanıcılarla paylaşmayın.</span></div><div className="account-password-actions"><button className="primary" disabled={pending || !online}>{pending ? <RefreshCw className="spin" /> : <KeyRound />}{pending ? 'Değiştiriliyor' : 'Şifreyi değiştir'}</button></div></form></div></div>;
}
