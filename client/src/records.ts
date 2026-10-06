import { WAGON_STATUSES, WAGON_TYPES, type CollectionName, type OperationalRecord, type Wagon, type Part, type Inventory } from '../../shared/types';

export interface FieldDefinition { key: string; label: string; kind?: 'date' | 'number' | 'textarea' | 'select'; options?: readonly string[]; required?: boolean; wide?: boolean; hint?: string; }
export const collectionNames: Record<CollectionName, string> = { wagons: 'Vagonlar', parts: 'Parçalar', inventory: 'Demirbaşlar' };
export const singularNames: Record<CollectionName, string> = { wagons: 'Vagon', parts: 'Parça', inventory: 'Demirbaş' };
export const fields: Record<CollectionName, FieldDefinition[]> = {
  wagons: [
    { key: 'number', label: 'Vagon numarası', required: true },
    { key: 'wagonType', label: 'Vagon tipi', kind: 'select', options: WAGON_TYPES },
    { key: 'status', label: 'Durum', kind: 'select', options: WAGON_STATUSES, required: true },
    { key: 'entryDate', label: 'Giriş tarihi', kind: 'date', required: true },
    { key: 'channelDate', label: 'Kanala giriş tarihi', kind: 'date' },
    { key: 'completedDate', label: 'Tamamlanma tarihi', kind: 'date' },
    { key: 'notes', label: 'Açıklama', kind: 'textarea', wide: true, hint: 'Yapılan işlemler, arıza bilgisi veya ekibe iletmek istediğiniz notlar.' },
  ],
  parts: [
    { key: 'type', label: 'Parça türü', required: true },
    { key: 'brand', label: 'Marka' },
    { key: 'quantity', label: 'Adet', kind: 'number', required: true },
    { key: 'serialNumber', label: 'Seri numarası' },
    { key: 'wagonNumber', label: 'Vagon numarası' },
    { key: 'removedDate', label: 'Söküm tarihi', kind: 'date' },
    { key: 'sentDate', label: 'Sevk tarihi', kind: 'date' },
    { key: 'returnedDate', label: 'Geri dönüş tarihi', kind: 'date' },
    { key: 'faultNotes', label: 'Arıza ve işlem açıklaması', kind: 'textarea', wide: true },
  ],
  inventory: [
    { key: 'type', label: 'Demirbaş türü', required: true },
    { key: 'brand', label: 'Marka' },
    { key: 'quantity', label: 'Adet', kind: 'number', required: true },
    { key: 'serialNumber', label: 'Seri numarası' },
  ],
};

export function rowValue(record: OperationalRecord, key: string): string {
  const value = (record as unknown as Record<string, string | number>)[key];
  return value === undefined || value === null ? '' : String(value);
}
export function rowTitle(record: OperationalRecord, collection: CollectionName): string {
  return collection === 'wagons' ? (record as Wagon).number : (record as Part | Inventory).type;
}
export function rowStatus(record: OperationalRecord, collection: CollectionName): string {
  if (collection === 'wagons') return (record as Wagon).status;
  if (collection === 'parts') {
    const part = record as Part;
    return part.returnedDate ? 'Geri döndü' : part.sentDate ? 'Sevk edildi' : 'Bekliyor';
  }
  return `${(record as Inventory).quantity} adet`;
}
export function statusColor(status: string): string {
  if (['Tamamlandı', 'Geri döndü'].includes(status)) return 'teal';
  if (['Bakım devam ediyor', 'Sevk edildi'].includes(status)) return 'blue';
  if (['Bekliyor', 'Parça bekliyor'].includes(status)) return 'amber';
  return 'teal';
}
export function formatDate(value?: string, withTime = false): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : { year: 'numeric' }), timeZone: 'Europe/Istanbul' }).format(date);
}
export function dateToday(): string { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul' }).format(new Date()); }
export function daysBetween(first: string, last = dateToday()): number {
  if (!first) return 0;
  return Math.max(0, Math.floor((Date.parse(last.slice(0, 10)) - Date.parse(first.slice(0, 10))) / 86400000) || 0);
}
export function exportCsv(collection: CollectionName, rows: OperationalRecord[]): void {
  const definition = fields[collection];
  const escapeCell = (value: string): string => {
    // Excel formül çalıştırmasını engelle; kaynak veriyi değiştirme.
    const safe = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const lines = [definition.map(field => escapeCell(field.label)).join(';'), ...rows.map(row => definition.map(field => escapeCell(rowValue(row, field.key))).join(';'))];
  const url = URL.createObjectURL(new Blob(['\ufeff', lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${collectionNames[collection]}-${dateToday()}.csv`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}
