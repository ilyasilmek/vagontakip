import { useEffect, useState } from 'react';
import { ArrowDownToLine, Check, Share, Smartphone, WifiOff } from 'lucide-react';
import Modal from './Modal';

interface InstallPrompt extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>; }
export function useInstall() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches || !!(navigator as Navigator & { standalone?: boolean }).standalone);
  useEffect(() => {
    const capture = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const complete = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener('beforeinstallprompt', capture);
    window.addEventListener('appinstalled', complete);
    return () => { window.removeEventListener('beforeinstallprompt', capture); window.removeEventListener('appinstalled', complete); };
  }, []);
  return { prompt, installed, clearPrompt: () => setPrompt(null) };
}

export default function Install({ prompt, installed, onClose, clearPrompt }: { prompt: InstallPrompt | null; installed: boolean; onClose: () => void; clearPrompt: () => void }) {
  const [pending, setPending] = useState(false);
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  async function install() {
    if (!prompt) return;
    setPending(true);
    try { await prompt.prompt(); const choice = await prompt.userChoice; clearPrompt(); if (choice.outcome === 'accepted') onClose(); }
    finally { setPending(false); }
  }
  return <Modal title="Telefonunuza ekleyin" subtitle="Atölyeniz bir dokunuş uzakta." onClose={onClose} footer={<><button className="secondary" onClick={onClose}>Kapat</button>{prompt && !installed && <button className="primary" disabled={pending} onClick={() => void install()}><ArrowDownToLine /> Uygulamayı yükle</button>}</>}><div className="install-instructions">{installed ? <div className="notice update-banner"><Check /><span>Vagon Takip bu cihaza zaten eklenmiş.</span></div> : ios ? <><p>iPhone veya iPad’de uygulamayı Safari ile açın.</p><ol><li>Safari’nin <strong>Paylaş <Share size={14} /></strong> düğmesine dokunun.</li><li><strong>Ana Ekrana Ekle</strong> seçeneğini bulun.</li><li><strong>Ekle</strong> düğmesine dokunun.</li></ol></> : prompt ? <p>“Uygulamayı yükle” düğmesine dokunun. Vagon Takip ana ekranınıza eklenir ve uygulama olarak açılır.</p> : <><p>Chrome, Edge veya telefonunuzun desteklenen tarayıcısında açın.</p><ol><li>Tarayıcının <strong>⋮ menüsünü</strong> açın.</li><li><strong>Uygulamayı yükle</strong> veya <strong>Ana ekrana ekle</strong> seçeneğine dokunun.</li><li>Yükleme isteğini onaylayın.</li></ol><p>Yükleme seçeneğinin görünmesi için uygulama HTTPS üzerinden açılmalıdır.</p></>}<div className="install-feature-grid"><div className="install-feature"><Smartphone /><strong>Doğrudan erişim</strong>Telefonunuzdaki uygulamalar arasında yer alır.</div><div className="install-feature"><WifiOff /><strong>Çevrimdışı görüntüleme</strong>Daha önce açtığınız kayıtları bağlantı olmadan inceleyin.</div></div></div></Modal>;
}
