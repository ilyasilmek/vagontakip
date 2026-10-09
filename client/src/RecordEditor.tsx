import { useState, type FormEvent } from 'react';
import { AlertTriangle, Check, Pencil, RefreshCw, Trash2, Wrench } from 'lucide-react';
import type { CollectionName, OperationalRecord, RecordResponse, SafeUser } from '../../shared/types';
import { api, ApiError } from './api';
import Modal from './Modal';
import WagonNumberInput from './WagonNumberInput';
import { dateToday, fields, formatDate, rowStatus, rowTitle, rowValue, singularNames, statusColor } from './records';

export default function RecordEditor({ collection, record, user, online, onClose, onSaved, onExpired, onConflict, onAddMaintenance, onNewMaintenance, maintenanceLoading = false }: { collection: CollectionName; record: OperationalRecord | null; user: SafeUser; online: boolean; onClose: () => void; onSaved: (message: string) => Promise<void>; onExpired: () => void; onConflict: () => Promise<void>; onAddMaintenance?: () => void; onNewMaintenance?: (wagon:Record<string,string|number>)=>void; maintenanceLoading?: boolean }) {
  const [editing, setEditing] = useState(!record);
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields[collection].map(field => [field.key, record ? rowValue(record, field.key) : field.key === 'quantity' ? '1' : field.key === 'status' ? 'Bekliyor' : field.key === 'entryDate' ? dateToday() : ''])));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const name = singularNames[collection];
  function handleError(reason: unknown) {
    if (reason instanceof ApiError && reason.status === 401) { onExpired(); return; }
    if (reason instanceof ApiError && reason.status === 409) { setConflict(true); setError('Bu kayıt başka bir kullanıcı tarafından değiştirildi. Yeni kaydı açıp değişikliklerinizi tekrar uygulayın.'); return; }
    setError(reason instanceof Error ? reason.message : 'İşlem tamamlanamadı. Bağlantınızı kontrol edin.');
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (pending || !online || conflict) return;
    const payload: Record<string, string | number> = {};
    for (const field of fields[collection]) payload[field.key] = field.kind === 'number' ? Number(values[field.key]) : values[field.key].trim();
    if (collection === 'wagons') {
      if (payload.status === 'Tamamlandı' && !payload.completedDate) { setError('Tamamlanan vagon için tamamlanma tarihi girin.'); return; }
      if (payload.status !== 'Tamamlandı' && payload.completedDate) { setError('Tamamlanma tarihi için durumu “Tamamlandı” olarak seçin.'); return; }
      if ((payload.channelDate && payload.channelDate < payload.entryDate) || (payload.completedDate && payload.completedDate < payload.entryDate)) { setError('Kanala giriş ve tamamlanma tarihleri, giriş tarihinden önce olamaz.'); return; }
    }
    setPending(true); setError('');
    try {
      await api<RecordResponse>(`/${collection}${record ? `/${encodeURIComponent(record.id)}` : ''}`, record ? 'PATCH' : 'POST', { ...payload, ...(record ? { revision: record.revision } : {}) });
      await onSaved(`${name} kaydı ${record ? 'güncellendi' : 'eklendi'}.`);
    } catch (reason) { handleError(reason); }
    finally { setPending(false); }
  }
  async function remove() {
    if (!record || !online || pending || conflict) return;
    setPending(true); setError('');
    try { await api(`/${collection}/${encodeURIComponent(record.id)}`, 'DELETE', { revision: record.revision }); await onSaved(`${name} kaydı silindi.`); }
    catch (reason) { handleError(reason); }
    finally { setPending(false); }
  }
  function addNewMaintenance() {
    const form=document.getElementById('record-form') as HTMLFormElement|null;
    if(!form?.reportValidity() || !onNewMaintenance) return;
    const payload=Object.fromEntries(fields[collection].map(field=>[field.key,values[field.key].trim()]));
    onNewMaintenance(payload);
  }
  const footer = editing ? <><button type="button" className="secondary" onClick={onClose} disabled={pending}>Vazgeç</button>{!record && collection==='wagons' && onNewMaintenance && <button type="button" className="secondary" onClick={addNewMaintenance} disabled={!online || pending || maintenanceLoading}><Wrench />{maintenanceLoading?'Bakım formu açılıyor…':'Bakım ekle'}</button>}<button type="submit" form="record-form" className="primary" disabled={pending || !online || conflict}>{pending ? <RefreshCw className="spin" /> : <Check />} {pending ? 'Kaydediliyor' : 'Kaydet'}</button></> : <><button type="button" className="secondary" onClick={onClose}>Kapat</button>{user.role === 'admin' && <button className="danger-button" onClick={() => setDeleting(true)} disabled={!online || pending || conflict}><Trash2 /> Sil</button>}{collection === 'wagons' && onAddMaintenance && <button type="button" className="secondary" disabled={!online || pending || maintenanceLoading} onClick={onAddMaintenance}><Wrench />{maintenanceLoading ? 'Bakım formu açılıyor…' : 'Bakım ekle'}</button>}<button className="primary" onClick={() => setEditing(true)} disabled={!online || pending || conflict}><Pencil /> Düzenle</button></>;
  return <Modal title={record ? (editing ? `${name} kaydını düzenle` : `${name} ayrıntıları`) : `Yeni ${name.toLocaleLowerCase('tr-TR')} ekle`} subtitle={record ? rowTitle(record, collection) : 'Kaydedilen bilgiler ekibinizle paylaşılır.'} onClose={() => { if (!pending) onClose(); }} canClose={!pending} footer={footer}>
    {!online && <div className="notice"><AlertTriangle /><span>Çevrimdışı görünüm. Değişiklik yapmak için internete bağlanın.</span></div>}
    {error && <div className="notice error form-error" role="alert"><AlertTriangle /><span>{error}</span></div>}
    {conflict && <button className="secondary" onClick={async () => { await onConflict(); onClose(); }}>Güncel verileri al ve kapat</button>}
    {editing ? <form id="record-form" onSubmit={save}><div className="form-grid">{fields[collection].map(field => <label key={field.key} htmlFor={`field-${field.key}`} className={field.wide ? 'full-width' : ''}>{field.label}{field.required && ' *'}{field.kind === 'textarea' ? <textarea id={`field-${field.key}`} value={values[field.key]} maxLength={10000} disabled={pending} onChange={event => setValues(current => ({ ...current, [field.key]: event.target.value }))} /> : field.kind === 'select' ? <select aria-label={field.label} id={`field-${field.key}`} value={values[field.key]} required={field.required} disabled={pending} onChange={event => setValues(current => ({ ...current, [field.key]: event.target.value, ...(field.key === 'status' && event.target.value !== 'Tamamlandı' ? { completedDate: '' } : {}) }))}>{field.key === 'wagonType' && <option value="">Belirtilmemiş</option>}{field.options?.map(option => <option key={option}>{option}</option>)}</select> : (collection==='wagons'&&field.key==='number')||field.key==='wagonNumber' ? <WagonNumberInput id={`field-${field.key}`} label={field.label+(field.required?' *':'')} value={values[field.key]} original={record?rowValue(record,field.key):undefined} required={field.required} disabled={pending} onChange={value=>setValues(current=>({...current,[field.key]:value}))}/> : <input id={`field-${field.key}`} type={field.kind || 'text'} min={field.kind === 'number' ? 0 : undefined} max={field.kind === 'number' ? 1000000 : undefined} step={field.kind === 'number' ? 1 : undefined} maxLength={200} inputMode={field.kind === 'number' ? 'numeric' : undefined} value={values[field.key]} required={field.required} disabled={pending} onChange={event => setValues(current => ({ ...current, [field.key]: event.target.value }))} />}{field.hint && <span className="field-hint">{field.hint}</span>}</label>)}</div><p className="form-warning">* Zorunlu alan. Değişiklikler kaydedildiğinde tüm kullanıcılar tarafından görülebilir.</p></form> : record && <><div className="detail-heading"><div><h3>{rowTitle(record, collection)}</h3><p><span className={`badge ${statusColor(rowStatus(record, collection))}`}>{rowStatus(record, collection)}</span></p></div></div><div className="detail-grid">{fields[collection].map(field => <div key={field.key} className={`detail-field ${field.wide ? 'full-width' : ''}`}><span>{field.label.toLocaleUpperCase('tr-TR')}</span><p>{field.kind === 'date' ? formatDate(rowValue(record, field.key)) : rowValue(record, field.key) || (field.key === 'wagonType' ? 'Belirtilmemiş' : '—')}</p></div>)}</div><div className="record-history"><span><strong>OLUŞTURULDU</strong><br />{formatDate(record.createdAt, true)}</span><span><strong>SON GÜNCELLEME</strong><br />{formatDate(record.updatedAt, true)}</span><span><strong>KAYIT SÜRÜMÜ</strong><br />{record.revision}</span></div></>}
    {deleting && <div className="confirm-delete" role="alert"><h3>Bu kayıt silinsin mi?</h3><p>Bu işlem kaydı ortak verilerden kaldırır. Tüm kullanıcıların ekranına yansır.</p><div className="confirm-actions"><button className="secondary" disabled={pending} onClick={() => setDeleting(false)}>Vazgeç</button><button className="danger-button" disabled={pending || conflict || !online} onClick={remove}>{pending ? <RefreshCw className="spin" /> : <Trash2 />} Kaydı sil</button></div></div>}
  </Modal>;
}
