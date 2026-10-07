import type { CollectionName, OperationalRecord } from '../../shared/types';
import { rowTitle } from './records';

export const SORT_OPTIONS = [
  { value: 'created-desc', label: 'Son kaydedilen' },
  { value: 'created-asc', label: 'İlk kaydedilen' },
  { value: 'updated-desc', label: 'Son güncellenen' },
  { value: 'title-asc', label: 'Numara / tür (A → Z)' },
  { value: 'title-desc', label: 'Numara / tür (Z → A)' },
] as const;
export type RecordSort = typeof SORT_OPTIONS[number]['value'];

const collator = new Intl.Collator('tr-TR', { numeric: true, sensitivity: 'base' });

export function compareRecords(a: OperationalRecord, b: OperationalRecord, collection: CollectionName, sort: RecordSort): number {
  let result: number;
  switch (sort) {
    case 'created-desc': result = b.createdAt.localeCompare(a.createdAt); break;
    case 'created-asc': result = a.createdAt.localeCompare(b.createdAt); break;
    case 'updated-desc': result = b.updatedAt.localeCompare(a.updatedAt); break;
    case 'title-asc': result = collator.compare(rowTitle(a, collection), rowTitle(b, collection)); break;
    case 'title-desc': result = collator.compare(rowTitle(b, collection), rowTitle(a, collection)); break;
  }
  return result || b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id);
}
