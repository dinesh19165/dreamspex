import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import * as XLSX from 'xlsx';
import { createReportWorkbookBytes, type AdminReportDocument } from './adminReportExport';

const report: AdminReportDocument = {
  title: 'Order report',
  startDate: '2026-11-01',
  endDate: '2026-11-09',
  columns: [
    { label: 'Order' },
    { label: 'Total', type: 'currency' },
    { label: 'Order date', type: 'date' },
  ],
  rows: [['DS-1', 1234.5, '2026-11-02']],
  summary: [{ label: 'Total orders', value: 1 }],
};

describe('admin report workbook', () => {
  it('creates a valid workbook with summary, formatted records, filters and frozen headings', () => {
    const bytes = createReportWorkbookBytes(report);
    const reopened = XLSX.read(bytes, { type: 'array', cellStyles: true });
    const worksheetXml = strFromU8(unzipSync(bytes)['xl/worksheets/sheet2.xml']);

    expect(reopened.SheetNames).toEqual(['Summary', 'Detailed records']);
    const details = reopened.Sheets['Detailed records'];
    expect(details['!autofilter']?.ref).toBe('A1:C2');
    expect(worksheetXml).toContain('<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>');
    expect(details.B2.z).toBe('"₹"#,##0.00');
    expect(details.C2.z).toBe('dd mmm yyyy');
    expect(XLSX.SSF.parse_date_code(details.C2.v)).toMatchObject({ y: 2026, m: 11, d: 2 });
    expect(XLSX.utils.sheet_to_json(details, { header: 1 })[1]).toEqual([
      'DS-1',
      1234.5,
      details.C2.v,
    ]);
  });
});
