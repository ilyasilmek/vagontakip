import { ArrowRight, CheckCheck, Clock3, FileSpreadsheet, Package, Plus, RefreshCw, TrainFront, Wrench } from 'lucide-react';
import { useState } from 'react';
import type { CollectionName, DataResponse, OperationalRecord } from '../../shared/types';
import { dateToday, daysBetween } from './records';
import Collection from './Collection';
import { exportExcel } from './Reports';


export default function Dashboard({ data, online, isAdmin, onPlan, onNavigate, onEdit, notify }: { data: DataResponse; online: boolean; isAdmin:boolean; onPlan:()=>void; onNavigate: (collection: CollectionName) => void; onEdit: (collection: CollectionName, record: OperationalRecord | null) => void; notify: (message: string) => void }) {
  const [exporting, setExporting] = useState(false);
  const active = data.wagons.filter(wagon => wagon.status !== 'Tamamlandı');
  const waiting = data.wagons.filter(wagon => wagon.status === 'Bekliyor' || wagon.status === 'Parça bekliyor');
  const completed = data.wagons.filter(wagon => wagon.status === 'Tamamlandı');
  const averageDays = active.length ? Math.round(active.reduce((sum, wagon) => sum + daysBetween(wagon.entryDate), 0) / active.length) : 0;
  async function report() {
    setExporting(true);
    try { await exportExcel(data); notify('Genel Excel raporu indirildi.'); }
    catch { notify('Rapor indirilemedi. Lütfen tekrar deneyin.'); }
    finally { setExporting(false); }
  }
  return <>
    <div className="page-heading"><div><h1>Genel bakış</h1><p>Vagon, parça ve demirbaş kayıtlarının güncel durumu.</p></div><div className="heading-actions"><button className="secondary refresh-button" onClick={() => void report()} disabled={exporting} aria-label="Genel Excel raporunu indir">{exporting ? <RefreshCw className="spin" /> : <FileSpreadsheet />} Excel raporu</button>{isAdmin&&data.maintenanceEnabled&&<button className="secondary" onClick={onPlan} disabled={!online}><Wrench /> Planlama</button>}<button className="primary" onClick={() => onEdit('wagons', null)} disabled={!online}><Plus /> Vagon ekle</button></div></div>
    <div className="dispatch-summary"><span>ATÖLYE DURUM ÇİZELGESİ</span><strong>{dateToday().split('-').reverse().join('.')}</strong><p>Aktif vagonlarda ortalama bakım süresi: {averageDays} gün</p></div>
    <div className="metrics"><div className="metric"><div className="metric-icon"><TrainFront /></div><div><span>Toplam vagon</span><strong>{data.wagons.length}</strong><small>Ortak kayıtlar</small></div></div><div className="metric"><div className="metric-icon blue"><Wrench /></div><div><span>Atölyedeki vagon</span><strong>{active.length}</strong><small>İşlemi devam eden</small></div></div><div className="metric"><div className="metric-icon amber"><Clock3 /></div><div><span>Bekleyen vagon</span><strong>{waiting.length}</strong><small>İşlem veya parça bekleyen</small></div></div><div className="metric"><div className="metric-icon purple"><CheckCheck /></div><div><span>Tamamlanan</span><strong>{completed.length}</strong><small>İşlemi biten vagon</small></div></div></div>
    <section id="wagon-collection-section" className="dashboard-wagon-collection"><Collection collection="wagons" rows={data.wagons} online={online} onEdit={record => onEdit('wagons', record)} updatedAt={data.updatedAt} /></section>
    <div className="quick-links"><button className="secondary" onClick={() => onNavigate('parts')}><Package /> {data.parts.reduce((sum, part) => sum + part.quantity, 0)} parça <ArrowRight /></button><button className="secondary" onClick={() => onNavigate('inventory')}><Wrench /> {data.inventory.reduce((sum, item) => sum + item.quantity, 0)} demirbaş <ArrowRight /></button></div>
  </>;
}
