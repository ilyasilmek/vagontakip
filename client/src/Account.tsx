import { useState, type FormEvent } from 'react';
import { AlertTriangle, ArrowDownToLine, KeyRound, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import type { SafeUser } from '../../shared/types';
import { api, ApiError } from './api';
import { initials } from './Admin';

export default function Account({ user, online, installed, onInstall, onLogout, onExpired, notify }: { user: SafeUser; online: boolean; installed: boolean; onInstall: () => void; onLogout: () => Promise<void>; onExpired: () => void; notify: (message: string) => void }) {
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
  return <div className="account-section"><div className="page-heading"><div><h1>Hesabım</h1><p>Hesabınızı ve uygulama erişiminizi yönetin.</p></div></div><div className="panel account-panel"><div className="account-heading"><div className="avatar">{initials(user.displayName)}</div><div><h2>{user.displayName}</h2><p>@{user.username} · {user.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}</p></div></div><div className="account-actions"><button className="secondary" onClick={onInstall}><ArrowDownToLine /> {installed ? 'Yükleme bilgisi' : 'Telefona yükle'}</button><button className="danger-button" onClick={() => void onLogout()} disabled={!online}><LogOut /> Çıkış yap</button></div><p className="account-info">{user.role === 'admin' ? 'Tüm kayıtları düzenleyebilir, silebilir ve ekibinizin hesaplarını yönetebilirsiniz.' : 'Vagon, parça ve demirbaş kayıtları ekleyebilir ve düzenleyebilirsiniz. Silme işlemleri yöneticiniz tarafından yapılır.'}</p>{!online && <div className="notice"><AlertTriangle /><span>Çevrimdışı kopyayı görüntülüyorsunuz. Şifre değiştirmek ve oturumdan çıkmak için bağlanın.</span></div>}</div><div className="panel account-panel"><h3>Şifreyi değiştir</h3>{error && <div className="notice error" role="alert"><AlertTriangle /><span>{error}</span></div>}<form onSubmit={save}><div className="form-grid"><label className="full-width">Mevcut şifre<input type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} required autoComplete="current-password" disabled={pending || !online} maxLength={256} /></label><label>Yeni şifre<input type="password" value={password} onChange={event => setPassword(event.target.value)} required minLength={12} maxLength={256} autoComplete="new-password" disabled={pending || !online} /></label><label>Yeni şifre tekrar<input type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} required minLength={12} maxLength={256} autoComplete="new-password" disabled={pending || !online} /></label></div><div className="security-note"><ShieldCheck /><span>En az 12 karakter kullanın. Şifrenizi diğer kullanıcılarla paylaşmayın.</span></div><div className="account-password-actions"><button className="primary" disabled={pending || !online}>{pending ? <RefreshCw className="spin" /> : <KeyRound />}{pending ? 'Değiştiriliyor' : 'Şifreyi değiştir'}</button></div></form></div></div>;
}
