import { useEffect } from 'react';
import { Brand } from './Login';

export default function Startup({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(onDone, reduced ? 150 : 5200);
    return () => window.clearTimeout(timer);
  }, [onDone]);
  return <div className="startup-overlay" role="status" aria-label="Vagon Takip açılıyor"><Brand /><div className="startup-club"><p>DEMİRYOL BİLİM VE<br />KÜLTÜR KULÜBÜ</p></div><div className="startup-track" aria-hidden="true" /><svg className="startup-train" viewBox="0 0 760 120" aria-hidden="true">
    {[15, 190, 365].map(x => <g key={x} transform={`translate(${x} 0)`}><rect x="0" y="30" width="155" height="60" rx="2" fill="#CCD6DD" stroke="#EDF1F2" strokeWidth="2" />{[22, 46, 70, 94, 118, 142].map(rib => <path key={rib} d={`M${rib} 34V85`} stroke="#6A7D8B" strokeWidth="2" />)}<path d="M0 78H155M155 91H175" stroke="#182C3A" strokeWidth="4" /><circle cx="25" cy="99" r="10" fill="#182C3A" stroke="#CCD6DD" strokeWidth="3" /><circle cx="129" cy="99" r="10" fill="#182C3A" stroke="#CCD6DD" strokeWidth="3" /></g>)}
    <g transform="translate(540 0)"><path d="M0 90V40H108V22H143L185 69V90Z" fill="#6A7D8B" stroke="#EDF1F2" strokeWidth="2" /><path d="M140 25L181 69H152L133 42Z" fill="#E8B735" /><path d="M111 28H133L151 49H111Z" fill="#182C3A" /><path d="M0 75H180" stroke="#E8B735" strokeWidth="6" /><rect x="30" y="48" width="54" height="21" rx="2" fill="#EDF1F2" /><text x="57" y="63" textAnchor="middle" fill="#182C3A" fontSize="16" fontWeight="700">GBZ</text><path d="M10 33V24H72V33M180 89H192" stroke="#CCD6DD" strokeWidth="4" /><circle cx="29" cy="99" r="11" fill="#182C3A" stroke="#CCD6DD" strokeWidth="3" /><circle cx="144" cy="99" r="11" fill="#182C3A" stroke="#CCD6DD" strokeWidth="3" /></g>
  </svg></div>;
}
