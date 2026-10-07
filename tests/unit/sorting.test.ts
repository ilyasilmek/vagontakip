import { describe, expect, it } from 'vitest';
import type { Wagon } from '../../shared/types';
import { compareRecords } from '../../client/src/sorting';

const wagon = (id: string, number: string, createdAt: string, updatedAt: string): Wagon => ({
  id, number, createdAt, updatedAt, revision: 1, updatedBy: 'admin',
  entryDate: '2026-10-07', channelDate: '', completedDate: '', status: 'Bekliyor', notes: '',
});
const rows = [
  wagon('old', 'Vagon 10', '2026-10-01T10:00:00Z', '2026-10-07T10:00:00Z'),
  wagon('new', 'Vagon 2', '2026-10-06T10:00:00Z', '2026-10-06T10:00:00Z'),
];
describe('record sorting', () => {
  it('distinguishes recently created records from recently edited records', () => {
    expect([...rows].sort((a, b) => compareRecords(a, b, 'wagons', 'created-desc')).map(row => row.id)).toEqual(['new', 'old']);
    expect([...rows].sort((a, b) => compareRecords(a, b, 'wagons', 'updated-desc')).map(row => row.id)).toEqual(['old', 'new']);
    expect([...rows].sort((a, b) => compareRecords(a, b, 'wagons', 'created-asc')).map(row => row.id)).toEqual(['old', 'new']);
  });
  it('sorts numbers naturally in both directions without mutating source data', () => {
    expect([...rows].sort((a, b) => compareRecords(a, b, 'wagons', 'title-asc')).map(row => row.number)).toEqual(['Vagon 2', 'Vagon 10']);
    expect([...rows].sort((a, b) => compareRecords(a, b, 'wagons', 'title-desc')).map(row => row.number)).toEqual(['Vagon 10', 'Vagon 2']);
    expect(rows.map(row => row.id)).toEqual(['old', 'new']);
  });
  it('uses a consistent tie breaker when dates are equal', () => {
    const a = wagon('a', 'Same', rows[0].createdAt, rows[0].updatedAt);
    const b = { ...a, id: 'b' };
    expect(compareRecords(a, b, 'wagons', 'created-desc')).toBeLessThan(0);
    expect(compareRecords(b, a, 'wagons', 'created-desc')).toBeGreaterThan(0);
  });
});
