import type { CollectionName, DataResponse, OperationalRecord } from '../../shared/types';
import { collectionNames, dateToday, fields, formatDate, rowValue } from './records';

export async function exportExcel(data: DataResponse): Promise<void> {
  const module = await import('exceljs');
  const ExcelJS = module.default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Vagon Takip';
  workbook.created = new Date();
  for (const collection of ['wagons', 'parts', 'inventory'] as CollectionName[]) {
    const sheet = workbook.addWorksheet(collectionNames[collection]);
    sheet.columns = fields[collection].map(field => ({ header: field.label, key: field.key, width: field.kind === 'textarea' ? 55 : 23 }));
    for (const record of data[collection] as OperationalRecord[]) {
      sheet.addRow(Object.fromEntries(fields[collection].map(field => [field.key, field.kind === 'number' ? Number(rowValue(record, field.key)) : field.kind === 'date' ? (rowValue(record, field.key) ? formatDate(rowValue(record, field.key)) : '') : rowValue(record, field.key)])));
    }
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: fields[collection].length } };
    sheet.getRow(1).height = 28;
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF163E44' } };
    sheet.eachRow((row, index) => { row.alignment = { vertical: 'middle', wrapText: true }; if (index > 1) row.font = { size: 11 }; });
  }
  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer as unknown as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const link = document.createElement('a');
  link.href = url; link.download = `Vagon-Takip-Genel-Rapor-${dateToday()}.xlsx`; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}
