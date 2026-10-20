import type { CollectionName, OperationalRecord } from '../../shared/types';

export const SORT_OPTIONS = [
  { value: 'created-desc', label: 'Son kaydedilen' },
  { value: 'created-asc', label: 'İlk kaydedilen' },
  { value: 'updated-desc', label: 'Son güncellenen' },
] as const;
export type RecordSort = typeof SORT_OPTIONS[number]['value'];

export function compareRecords(a: OperationalRecord, b: OperationalRecord, collection: CollectionName, sort: RecordSort): number {
  let result: number;
  switch (sort) {
    case 'created-desc': result = b.createdAt.localeCompare(a.createdAt); break;
    case 'created-asc': result = a.createdAt.localeCompare(b.createdAt); break;
    case 'updated-desc': result = b.updatedAt.localeCompare(a.updatedAt); break;
  }
  return result || b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id);
}
