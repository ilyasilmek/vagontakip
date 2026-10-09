import { useCallback, useEffect, useState } from 'react';
import type { WorkshopData, WorkshopOperation } from '../../shared/workshop';
import { api, ApiError } from './api';

const dateTime = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Istanbul' });

export default function WagonMaintenanceHistory({ wagonNumber, refreshKey, onExpired }: { wagonNumber: string; refreshKey: number; onExpired: () => void }) {
  const [operations, setOperations] = useState<WorkshopOperation[] | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const load = useCallback(() => setRetry(value => value + 1), []);

  useEffect(() => {
    let active = true;
    setOperations(null);
    setError(false);
    void api<WorkshopData>('/workshop').then(result => {
      if (!active) return;
      setOperations(result.operations.filter(operation => operation.wagonNumber === wagonNumber)
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt) || b.createdAt.localeCompare(a.createdAt)));
    }).catch(reason => {
      if (!active) return;
      if (reason instanceof ApiError && reason.status === 401) onExpired();
      else setError(true);
    });
    return () => { active = false; };
  }, [wagonNumber, refreshKey, retry, onExpired]);

  return <section className="wagon-maintenance-history" aria-label="Yapılan bakımlar">
    <h4>Yapılan bakımlar{operations ? ` (${operations.length})` : ''}</h4>
    {error ? <div className="wagon-maintenance-message" role="alert">Bakım kayıtları yüklenemedi. <button type="button" className="text-link" onClick={load}>Yeniden dene</button></div>
      : !operations ? <p className="wagon-maintenance-message" role="status">Bakım kayıtları yükleniyor…</p>
        : operations.length === 0 ? <p className="wagon-maintenance-message">Bu vagon için kayıtlı bakım bulunmuyor.</p>
          : <div className="wagon-maintenance-list">{operations.map(operation => <article key={operation.id} className="wagon-maintenance-item">
            <div className="wagon-maintenance-item-heading"><strong>{dateTime.format(new Date(operation.startedAt))}</strong><span>{operation.supervisor}</span></div>
            <p className="wagon-maintenance-period">Bitiş: {dateTime.format(new Date(operation.finishedAt))}</p>
            <ul>{operation.jobs.map(job => <li key={job.id}><span>{job.name}</span><strong>{job.quantity} adet</strong></li>)}</ul>
          </article>)}</div>}
    <p className="wagon-maintenance-hint">Süre, personel ve bekleme ayrıntıları Bakım operasyonları bölümünde görülebilir.</p>
  </section>;
}
