import { useEffect, useState, type CSSProperties } from 'react';
import { Brand } from './Login';

export default function Startup({ onDone }: { onDone: () => void }) {
  const [imageReady, setImageReady] = useState(false);
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced && !imageReady) return;
    const timer = window.setTimeout(onDone, reduced ? 150 : 6000);
    return () => window.clearTimeout(timer);
  }, [onDone, imageReady]);
  return <div className="startup-overlay" data-ready={imageReady} role="status" aria-label="Vagon Takip açılıyor"><Brand /><div className="startup-club" aria-label="DEMİRYOL BİLİM VE KÜLTÜR KULÜBÜ"><p aria-hidden="true">{['DEMİRYOL BİLİM VE', 'KÜLTÜR KULÜBÜ'].map((line, lineIndex) => <span className="startup-club-line" key={line}>{Array.from(line).map((letter, index) => <span className="startup-letter" key={index} style={{ '--letter-delay': `${3000 + (index + (lineIndex === 0 ? 0 : 17)) * 65}ms` } as CSSProperties}>{letter === ' ' ? '\u00a0' : letter}</span>)}</span>)}</p></div><div className="startup-track" aria-hidden="true" /><img className="startup-train" src="/images/gbz-freight-train.png" alt="" aria-hidden="true" onLoad={() => setImageReady(true)} onError={onDone} />
  </div>;
}
