import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getDocument: vi.fn(),
  createWorker: vi.fn(),
}));

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: mocks.getDocument,
}));

vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: 'pdf-worker.js' }));
vi.mock('tesseract.js', () => ({ createWorker: mocks.createWorker }));

import { isPrescriptionPdfTextUsable, pdfTextItemsToLines, recognizePrescription } from './prescriptionService';

function makePdfPage(items: Array<{ str: string; transform?: number[] }>) {
  return {
    getTextContent: vi.fn().mockResolvedValue({ items }),
    getViewport: vi.fn(({ scale }: { scale: number }) => ({ width: 120 * scale, height: 160 * scale })),
    render: vi.fn().mockReturnValue({ promise: Promise.resolve() }),
  };
}

function makePdfFile() {
  return {
    type: 'application/pdf',
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
  } as unknown as File;
}

describe('prescription PDF extraction', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('uses the PDF text layer without starting OCR', async () => {
    const page = makePdfPage([
      { str: 'Patient Name: Avery Example' },
      { str: 'OD SPH -2.00 CYL -0.75 AXIS 90', transform: [1, 0, 0, 1, 10, 100] },
      { str: 'OS SPH +1.00 CYL +0.25 AXIS 180', transform: [1, 0, 0, 1, 10, 80] },
      { str: 'PD: 62', transform: [1, 0, 0, 1, 10, 60] },
    ]);
    mocks.getDocument.mockReturnValue({ promise: Promise.resolve({ numPages: 1, getPage: () => page }) });

    const result = await recognizePrescription(makePdfFile(), vi.fn());

    expect(result.method).toBe('PDF_TEXT');
    expect(result.text).toContain('SPH -2.00');
    expect(result.confidence).toBeNull();
    expect(mocks.createWorker).not.toHaveBeenCalled();
  });

  it('falls back to Tesseract for a scanned PDF with no usable text layer', async () => {
    const page = makePdfPage([]);
    mocks.getDocument.mockReturnValue({ promise: Promise.resolve({ numPages: 1, getPage: () => page }) });
    const recognize = vi.fn().mockResolvedValue({ data: { text: 'OD SPH -1.00', confidence: 83 } });
    mocks.createWorker.mockResolvedValue({ recognize, terminate: vi.fn() });
    vi.stubGlobal('document', {
      createElement: () => ({ width: 0, height: 0, getContext: () => ({}) }),
    });

    const result = await recognizePrescription(makePdfFile(), vi.fn());

    expect(result.method).toBe('OCR');
    expect(result.text).toBe('OD SPH -1.00');
    expect(result.confidence).toBe(83);
    expect(recognize).toHaveBeenCalledOnce();
    expect(page.render).toHaveBeenCalledOnce();
    expect(page.getViewport).toHaveBeenLastCalledWith({ scale: 300 / 72 });
  });

  it('falls back to Tesseract when a PDF text layer contains only one eye', async () => {
    const page = makePdfPage([
      { str: 'Patient Name: Avery Example' },
      { str: 'OD SPH -2.00 CYL -0.75 AXIS 90' },
    ]);
    mocks.getDocument.mockReturnValue({ promise: Promise.resolve({ numPages: 1, getPage: () => page }) });
    const recognize = vi.fn().mockResolvedValue({
      data: { text: 'Patient Name: Avery Example\nOD SPH -2.00\nOS SPH +1.00', confidence: 90 },
    });
    mocks.createWorker.mockResolvedValue({ recognize, terminate: vi.fn() });
    vi.stubGlobal('document', {
      createElement: () => ({ width: 0, height: 0, getContext: () => ({}) }),
    });

    const result = await recognizePrescription(makePdfFile(), vi.fn());

    expect(result.method).toBe('OCR');
    expect(result.text).toContain('OS SPH +1.00');
    expect(recognize).toHaveBeenCalledOnce();
  });

  it('rejects short or non-prescription PDF text as a usable layer', () => {
    expect(isPrescriptionPdfTextUsable('OD SPH -2.00 CYL -0.75')).toBe(false);
    expect(isPrescriptionPdfTextUsable('OD SPH -2.00 CYL -0.75\nOS SPH +1.00 CYL 0.00')).toBe(true);
    expect(isPrescriptionPdfTextUsable('Document title')).toBe(false);
    expect(isPrescriptionPdfTextUsable('PD 31')).toBe(false);
  });

  it('keeps PDF.js text rows separate for OD and OS parsing', () => {
    const text = pdfTextItemsToLines([
      { str: 'OD SPH -2.00', transform: [1, 0, 0, 1, 10, 100] },
      { str: 'CYL -0.75 AXIS 90', transform: [1, 0, 0, 1, 150, 100] },
      { str: 'OS SPH +1.00 CYL +0.25 AXIS 180', transform: [1, 0, 0, 1, 10, 80] },
    ]);

    expect(text).toBe('OD SPH -2.00 CYL -0.75 AXIS 90\nOS SPH +1.00 CYL +0.25 AXIS 180');
  });
});
