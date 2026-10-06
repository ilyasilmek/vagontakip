import { useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole, RefreshCw, ShieldCheck, Smartphone, TrainFront, TriangleAlert } from 'lucide-react';
import { api } from './api';
import type { SafeUser } from '../../shared/types';

export function Brand() {
  return <div className="brand"><div className="brand-icon"><TrainFront strokeWidth={1.8} /></div><div><div className="brand-name">Vagon Takip</div><small>ATÖLYE YÖNETİMİ</small></div></div>;
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
      setPassword('');
      await onLogin(response.user);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Giriş yapılamadı. Bağlantınızı kontrol edin.'); }
    finally { setPending(false); }
  }
  return <div className="login-shell">
    <aside className="login-art"><Brand /><div className="login-message"><p className="eyebrow">ATÖLYENİZ, HER ZAMAN YANINIZDA</p><h1>Her vagon.<br />Her işlem.<br />Tek bir yerde.</h1><p>Vagonların durumunu, parçaları ve demirbaşları ekibinizle birlikte takip edin.</p><div className="login-feature"><Smartphone /> Telefonunuzdan kolayca erişin</div><div className="login-feature"><RefreshCw /> Ekibinizle güncel verileri paylaşın</div><div className="login-feature"><ShieldCheck /> Yetkili erişim, güvenli kayıtlar</div></div><p className="login-art-foot">VAGON TAKİP · MOBİL ATÖLYE YÖNETİMİ</p></aside>
    <main className="login-panel"><form className="login-form" onSubmit={submit}><div className="mobile-brand"><Brand /></div><span className="eyebrow">ÇALIŞMA ALANINIZA HOŞ GELDİNİZ</span><h2>Giriş yapın.</h2><p>Devam etmek için yöneticinizin sizin için oluşturduğu hesap bilgilerini kullanın.</p>{error && <div className="notice error" role="alert"><TriangleAlert /><span>{error}</span></div>}<label htmlFor="username">Kullanıcı adı<input id="username" name="username" value={username} onChange={event => setUsername(event.target.value)} placeholder="Kullanıcı adınızı yazın" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={80} disabled={pending} /></label><label htmlFor="password">Şifre<div className="password-input"><input id="password" name="password" type={visible ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} placeholder="Şifrenizi yazın" autoComplete="current-password" required maxLength={256} disabled={pending} /><button type="button" className="icon-button" aria-label={visible ? 'Şifreyi gizle' : 'Şifreyi göster'} onClick={() => setVisible(value => !value)}>{visible ? <EyeOff /> : <Eye />}</button></div></label><button className="primary" type="submit" disabled={pending || !username.trim() || !password}>{pending ? <><RefreshCw className="spin" /> Giriş yapılıyor</> : <>Giriş yap <ArrowRight /></>}</button><div className="security-note"><LockKeyhole /><span>Hesabınız yoksa veya şifrenizi unuttuysanız yöneticinizle iletişime geçin.</span></div><div className="login-footnote">Sahada, atölyede, yolda.<br />Vagon Takip her zaman yanınızda.</div></form></main>
  </div>;
}
