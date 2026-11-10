import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import * as XLSX from 'xlsx';

export type ReportColumn = {
  label: string;
  type?: 'currency' | 'date' | 'number';
};

export type ReportSummary = { label: string; value: string | number }[];

export type AdminReportDocument = {
  title: string;
  startDate: string;
  endDate: string;
  columns: ReportColumn[];
  rows: (string | number | null)[][];
  summary?: ReportSummary;
};

const generatedDate = () => new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Kolkata',
}).format(new Date());

const reportDate = (value: string) => value
  ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' }).format(new Date(`${value}T00:00:00+05:30`))
  : 'All dates';

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character] ?? character));

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function fileName(document: AdminReportDocument, extension: string) {
  return `dream-spex-${document.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${document.startDate || 'all'}-to-${document.endDate || 'all'}.${extension}`;
}

export function createReportWorkbook(document: AdminReportDocument) {
  const workbook = XLSX.utils.book_new();
  const summaryRows = [
    ['Dream Spex', document.title],
    ['Date range', `${reportDate(document.startDate)} - ${reportDate(document.endDate)}`],
    ['Generated', generatedDate()],
    [],
    ...(document.summary ?? []).map(({ label, value }) => [label, value]),
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet['!cols'] = [{ wch: 28 }, { wch: 32 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  const records = [
    document.columns.map(({ label }) => label),
    ...document.rows.map((row) => row.map((value, index) => {
      if (document.columns[index]?.type !== 'date' || typeof value !== 'string' || !value) return value;
      const date = new Date(`${value}T00:00:00.000Z`);
      return Number.isNaN(date.getTime()) ? value : date;
    })),
  ];
  const detailSheet = XLSX.utils.aoa_to_sheet(records);
  detailSheet['!cols'] = document.columns.map((column, index) => {
    const maxLength = Math.max(column.label.length, ...document.rows.map((row) => String(row[index] ?? '').length));
    return { wch: Math.min(Math.max(maxLength + 2, 12), 42) };
  });
  detailSheet['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' };
  if (document.rows.length) {
    detailSheet['!autofilter'] = { ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: document.rows.length, c: document.columns.length - 1 },
    }) };
  }
  document.columns.forEach((column, columnIndex) => {
    if (!column.type) return;
    for (let rowIndex = 1; rowIndex <= document.rows.length; rowIndex += 1) {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
      const cell = detailSheet[cellAddress];
      if (!cell) continue;
      cell.z = column.type === 'currency' ? '"₹"#,##0.00' : column.type === 'date' ? 'dd mmm yyyy' : '#,##0.##';
    }
  });
  XLSX.utils.book_append_sheet(workbook, detailSheet, 'Detailed records');
  return workbook;
}

export function downloadReportExcel(document: AdminReportDocument) {
  const data = createReportWorkbookBytes(document);
  downloadBlob(new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName(document, 'xlsx'));
}

export function createReportWorkbookBytes(document: AdminReportDocument) {
  const workbook = createReportWorkbook(document);
  const files = unzipSync(new Uint8Array(XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })));
  const detailPath = 'xl/worksheets/sheet2.xml';
  const detailSheet = files[detailPath];
  if (!detailSheet) throw new Error('The detailed report worksheet could not be generated.');
  const xml = strFromU8(detailSheet);
  const sheetView = /<sheetView([^>]*)\/>/.exec(xml);
  if (!sheetView) throw new Error('The report worksheet could not be configured with a frozen header.');
  files[detailPath] = strToU8(xml.replace(sheetView[0],
    `<sheetView${sheetView[1]}><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView>`));
  return zipSync(files, { level: 6 });
}

async function addLogo(pdf: jsPDF) {
  const response = await fetch('/assets/images/dream-spex-logo00.png');
  if (!response.ok) throw new Error('Unable to load the Dream Spex report logo.');
  const logo = await response.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Unable to read logo image.'));
    reader.onerror = () => reject(new Error('Unable to read logo image.'));
    reader.readAsDataURL(logo);
  });
  pdf.addImage(dataUrl, 'PNG', 14, 8, 24, 14);
}

export async function downloadReportPdf(document: AdminReportDocument) {
  const landscape = document.columns.length > 6;
  const pdf = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', format: 'a4' });
  await addLogo(pdf);
  pdf.setTextColor(25, 45, 33);
  pdf.setFontSize(15);
  pdf.text(document.title, 42, 15);
  pdf.setFontSize(9);
  pdf.setTextColor(90, 100, 94);
  pdf.text(`Period: ${reportDate(document.startDate)} - ${reportDate(document.endDate)}`, 42, 21);
  pdf.text(`Generated: ${generatedDate()}`, 42, 26);

  const summary = document.summary ?? [];
  autoTable(pdf, {
    startY: 32,
    head: summary.length ? [['Summary', 'Value']] : undefined,
    body: summary.map(({ label, value }) => [label, String(value)]),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [34, 92, 63] },
    margin: { left: 14, right: 14 },
  });
  autoTable(pdf, {
    startY: (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
      ? (pdf as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
      : 34,
    head: [document.columns.map(({ label }) => label)],
    body: document.rows.map((row) => row.map((cell, index) => {
      if (cell == null) return '';
      if (document.columns[index]?.type === 'currency' && typeof cell === 'number') {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(cell);
      }
      return String(cell);
    })),
    theme: 'striped',
    styles: { fontSize: landscape ? 7 : 6, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: [34, 92, 63], fontSize: landscape ? 7 : 6 },
    margin: { left: 10, right: 10 },
    showHead: 'everyPage',
    didDrawPage: () => {
      const pageCount = pdf.getNumberOfPages();
      pdf.setFontSize(8);
      pdf.setTextColor(100);
      pdf.text(`Page ${pageCount}`, pdf.internal.pageSize.getWidth() - 20, pdf.internal.pageSize.getHeight() - 8);
    },
  });
  pdf.save(fileName(document, 'pdf'));
}

export function printReport(document: AdminReportDocument) {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1100,height=800');
  if (!printWindow) throw new Error('The report window was blocked. Allow pop-ups to print this report.');
  const headers = document.columns.map(({ label }) => `<th>${escapeHtml(label)}</th>`).join('');
  const rows = document.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(String(cell ?? ''))}</td>`).join('')}</tr>`).join('');
  const summary = (document.summary ?? []).map(({ label, value }) => `<div><strong>${escapeHtml(label)}</strong>${escapeHtml(String(value))}</div>`).join('');
  printWindow.opener = null;
  printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(document.title)}</title><style>
    @page{size:A4 ${document.columns.length > 6 ? 'landscape' : 'portrait'};margin:12mm}
    *{box-sizing:border-box}body{font:10px Arial,sans-serif;color:#173223;margin:0}
    header{display:flex;align-items:center;gap:14px;border-bottom:2px solid #285e42;padding-bottom:10px}
    header img{width:90px;max-height:48px;object-fit:contain}h1{font-size:18px;margin:0 0 5px}
    p{margin:2px 0;color:#526258}.summary{margin:12px 0;display:grid;grid-template-columns:repeat(3,1fr);gap:4px 12px}
    .summary div{border-bottom:1px solid #d5ddd7;padding:4px}.summary strong{display:block;color:#526258}
    table{width:100%;border-collapse:collapse;table-layout:auto;font-size:8px}thead{display:table-header-group}
    th,td{border:1px solid #ccd5ce;padding:4px;text-align:left;overflow-wrap:anywhere}
    thead th{background:#285e42!important;color:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    tr{break-inside:avoid}footer{margin-top:8px;text-align:right;color:#65736a}
    @media screen{body{padding:24px}.paper{max-width:1100px;margin:auto}}
  </style></head><body><main class="paper"><header><img src="/assets/images/dream-spex-logo00.png" alt="Dream Spex"><div><h1>${escapeHtml(document.title)}</h1><p>Period: ${escapeHtml(reportDate(document.startDate))} - ${escapeHtml(reportDate(document.endDate))}</p><p>Generated: ${escapeHtml(generatedDate())}</p></div></header>
    <section class="summary">${summary}</section>
    <table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table><footer>Dream Spex · Page numbers are provided by the browser print dialog</footer></main>
    <script>window.addEventListener('load',()=>{window.print()})</script></body></html>`);
  printWindow.document.close();
}
