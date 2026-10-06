import { useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, RefreshCw, TriangleAlert } from 'lucide-react';
import { api } from './api';
import type { SafeUser } from '../../shared/types';

export function Brand() {
  return <div className="brand"><div className="gbz-plate" aria-label="GBZ">GBZ</div><div><div className="brand-name">Vagon Takip</div><small>BAKIM VE KAYIT</small></div></div>;
}

export default function Login({ onLogin }: { onLogin: (user: SafeUser) => Promise<void> }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError(''); setPending(true);
    try {
      const response = await api<{ user: SafeUser }>('/login', 'POST', { username: username.trim(), password });
      setPassword(''); await onLogin(response.user);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Giriş yapılamadı. Bağlantınızı kontrol edin.'); }
    finally { setPending(false); }
  }
  return <div className="login-shell"><header className="login-masthead"><Brand /></header><main className="login-panel"><form className="login-form" onSubmit={submit}><p className="eyebrow">PERSONEL ERİŞİMİ</p><h1>Giriş yap</h1>{error && <div className="notice error" role="alert"><TriangleAlert /><span>{error}</span></div>}<label htmlFor="username">Kullanıcı adı<input id="username" name="username" value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={64} disabled={pending} /></label><label htmlFor="password">Şifre<div className="password-input"><input id="password" name="password" type={visible ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required maxLength={256} disabled={pending} /><button type="button" className="icon-button" aria-label={visible ? 'Şifreyi gizle' : 'Şifreyi göster'} onClick={() => setVisible(value => !value)}>{visible ? <EyeOff /> : <Eye />}</button></div></label><button className="primary" type="submit" disabled={pending || !username.trim() || !password}>{pending ? <><RefreshCw className="spin" /> Giriş yapılıyor</> : <>Giriş yap <ArrowRight /></>}</button><p className="login-help">Hesap ve şifre işlemleri için yöneticinize başvurun.</p></form></main><footer className="login-footer"><strong>GBZ</strong> / VAGON TAKİP</footer></div>;
}
