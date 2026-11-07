import { apiFetch as fetch } from './apiClient';
import { apiBaseUrl } from '../config/api';

const maxFileSize = 10 * 1024 * 1024;
const allowedTypes = new Set(['image/jpeg', 'image/png', 'application/pdf']);

export type PrescriptionFile = {
  id: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  checksum: string;
};

export type PrescriptionRecord = {
  id: string;
  patientName: string;
  prescriptionDate: string | null;
  expiryDate: string | null;
  rightSph: number | null;
  rightCyl: number | null;
  rightAxis: number | null;
  rightAdd: number | null;
  leftSph: number | null;
  leftCyl: number | null;
  leftAxis: number | null;
  leftAdd: number | null;
  pd: number | null;
  rightPd: number | null;
  leftPd: number | null;
  status: string;
  source: 'UPLOAD' | 'MANUAL';
  extractionStatus: string;
  extractionConfidence: number | null;
  customerConfirmed: boolean;
  productId: string | null;
  orderId: string | null;
  selectedLensCodes: string[];
  missingFields: string[];
  files: PrescriptionFile[];
};

export type PrescriptionValues = {
  patientName: string;
  prescriptionDate: string;
  expiryDate: string;
  rightSph: string;
  rightCyl: string;
  rightAxis: string;
  rightAdd: string;
  leftSph: string;
  leftCyl: string;
  leftAxis: string;
  leftAdd: string;
  pd: string;
  rightPd: string;
  leftPd: string;
};

export type PrescriptionUpload = {
  file?: File;
  previewUrl?: string;
  fileId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
};

export type LensOption = {
  id: string;
  code: string;
  name: string;
  category: 'TYPE' | 'COATING' | 'MATERIAL';
  benefits: string;
  additionalCost: number | null;
  preparationDays: number | null;
  available: boolean;
  displayOrder: number;
  recommended: boolean;
  recommendationReason: string | null;
};

type ProblemResponse = { message?: string; fieldErrors?: Array<{ field: string; message: string }> };

function accessToken() {
  const raw = window.localStorage.getItem('dream-spex-auth-session');
  if (!raw) throw new Error('Sign in to save your prescription.');
  const token = (JSON.parse(raw) as { accessToken?: string }).accessToken;
  if (!token) throw new Error('Sign in to save your prescription.');
  return token;
}

async function request<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${apiBaseUrl}/api/v1/prescriptions${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({})) as ProblemResponse;
    const fields = problem.fieldErrors?.map((error) => `${error.field}: ${error.message}`).join(', ');
    throw new Error(fields || problem.message || `Prescription request failed (${response.status}).`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function validatePrescriptionFile(file: File) {
  if (!allowedTypes.has(file.type)) throw new Error('Choose a JPG, JPEG, PNG, or PDF file.');
  if (file.size > maxFileSize) throw new Error('Prescription files must be 10 MB or smaller.');
}

export function uploadPrescription(file: File, prescriptionId: string, onProgress: (progress: number) => void): Promise<PrescriptionUpload> {
  validatePrescriptionFile(file);
  return new Promise((resolve, reject) => {
    const body = new FormData();
    body.append('file', file);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${apiBaseUrl}/api/v1/prescriptions/${encodeURIComponent(prescriptionId)}/files`);
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken()}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => reject(new Error('Prescription upload failed. Check your connection and retry.'));
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        let message = `Prescription upload failed (${xhr.status}).`;
        try {
          message = (JSON.parse(xhr.responseText) as ProblemResponse).message ?? message;
        } catch {
          // Keep the explicit HTTP failure when the server response is not JSON.
        }
        reject(new Error(message));
        return;
      }
      const saved = JSON.parse(xhr.responseText) as PrescriptionFile;
      resolve({
        file,
        previewUrl: URL.createObjectURL(file),
        fileId: saved.id,
        fileName: saved.originalName,
        contentType: saved.contentType,
        sizeBytes: saved.sizeBytes,
      });
    };
    xhr.send(body);
  });
}

export function isPrescriptionPdfTextUsable(text: string) {
  const nonWhitespaceLength = text.replace(/\s/g, '').length;
  const markers = text.match(/\b(?:OD|OS|SPH|CYL|AXIS|PD|PUPILLARY)\b/gi)?.length ?? 0;
  const hasRightEye = /\b(?:OD|R|RIGHT(?:\s+EYE)?)\b/i.test(text);
  const hasLeftEye = /\b(?:OS|L|LEFT(?:\s+EYE)?)\b/i.test(text);
  const hasPrescriptionNumbers = /[+-]?\d{1,2}(?:\.\d{1,2})?/.test(text);
  return nonWhitespaceLength >= 16 && markers >= 2 && hasRightEye && hasLeftEye && hasPrescriptionNumbers;
}

export function pdfTextItemsToLines(items: Array<{ str: string; transform?: number[] }>) {
  const lines: Array<{ y: number; text: string }> = [];
  const unpositioned: string[] = [];
  for (const item of items) {
    const text = item.str.trim();
    if (!text) continue;
    const y = item.transform?.[5];
    if (y == null || !Number.isFinite(y)) {
      unpositioned.push(text);
      continue;
    }
    const line = lines.find((candidate) => Math.abs(candidate.y - y) <= 2);
    if (line) line.text += ` ${text}`;
    else lines.push({ y, text });
  }
  const positionedText = lines.sort((first, second) => second.y - first.y).map((line) => line.text);
  if (unpositioned.length) positionedText.push(unpositioned.join(' '));
  return positionedText.join('\n');
}

export async function recognizePrescription(file: File, onProgress: (status: string, progress: number) => void) {
  let pdfjs: typeof import('pdfjs-dist') | undefined;
  let pdfDocument: import('pdfjs-dist').PDFDocumentProxy | undefined;
  if (file.type === 'application/pdf') {
    const [pdfModule, { default: pdfWorkerUrl }] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]);
    pdfjs = pdfModule;
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    pdfDocument = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const pageCount = Math.min(pdfDocument.numPages, 3);
    const textPages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber);
      onProgress(`Reading PDF text, page ${pageNumber} of ${pageCount}`, (pageNumber - 1) / pageCount);
      const content = await page.getTextContent();
      textPages.push(pdfTextItemsToLines(content.items.map((item) => ({
        str: 'str' in item ? item.str : '',
        transform: 'transform' in item ? item.transform : undefined,
      }))));
    }
    const pdfText = textPages.join('\n').trim();
    if (isPrescriptionPdfTextUsable(pdfText)) {
      return { text: pdfText, confidence: null, method: 'PDF_TEXT' as const };
    }
  }

  const images: Array<{ image: File | HTMLCanvasElement; cleanup?: () => void }> = [];
  if (file.type === 'application/pdf') {
    if (!pdfjs || !pdfDocument) throw new Error('PDF processing is unavailable.');
    const pageCount = Math.min(pdfDocument.numPages, 3);
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(300 / 72, 4096 / Math.max(baseViewport.width, baseViewport.height));
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport }).promise;
      images.push({ image: canvas, cleanup: () => { canvas.width = 0; canvas.height = 0; } });
    }
  } else {
    images.push({ image: file });
  }

  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', 1, {
    logger: (message) => onProgress(message.status, message.progress ?? 0),
  });
  try {
    const results: string[] = [];
    const confidence: number[] = [];
    for (let index = 0; index < images.length; index += 1) {
      onProgress(`Reading page ${index + 1} of ${images.length}`, index / images.length);
      const result = await worker.recognize(images[index].image);
      results.push(result.data.text);
      confidence.push(result.data.confidence);
      images[index].cleanup?.();
    }
    return {
      text: results.join('\n'),
      confidence: confidence.length ? confidence.reduce((total, value) => total + value, 0) / confidence.length : 0,
      method: 'OCR' as const,
    };
  } finally {
    images.forEach((image) => image.cleanup?.());
    await worker.terminate();
  }
}

export function prescriptionRequest(values: PrescriptionValues, productId: string, source: 'UPLOAD' | 'MANUAL',
                                    confirmed = false, extractionStatus = 'NOT_RUN', extractionConfidence: number | null = null) {
  const number = (value: string) => value.trim() === '' ? null : Number(value);
  return {
    patientName: values.patientName.trim(),
    prescriptionDate: values.prescriptionDate || null,
    expiryDate: values.expiryDate || null,
    rightSph: number(values.rightSph), rightCyl: number(values.rightCyl), rightAxis: number(values.rightAxis),
    rightAdd: number(values.rightAdd), leftSph: number(values.leftSph), leftCyl: number(values.leftCyl),
    leftAxis: number(values.leftAxis), leftAdd: number(values.leftAdd), pd: number(values.pd),
    rightPd: number(values.rightPd), leftPd: number(values.leftPd),
    source, extractionStatus, extractionConfidence, customerConfirmed: confirmed, productId,
  };
}

export const prescriptionService = {
  list: (productId: string) => request<PrescriptionRecord[]>(`?productId=${encodeURIComponent(productId)}`),
  get: (id: string) => request<PrescriptionRecord>(`/${encodeURIComponent(id)}`),
  create: (values: PrescriptionValues, productId: string) =>
    request<PrescriptionRecord>('', { method: 'POST', body: JSON.stringify(prescriptionRequest(values, productId, 'MANUAL')) }),
  update: (id: string, values: PrescriptionValues, productId: string, source: 'UPLOAD' | 'MANUAL',
          confirmed = false, extractionStatus = 'NOT_RUN', extractionConfidence: number | null = null) =>
    request<PrescriptionRecord>(`/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(prescriptionRequest(values, productId, source, confirmed, extractionStatus, extractionConfidence)),
    }),
  extract: (id: string, text: string, confidence: number | null) =>
    request<PrescriptionRecord>(`/${encodeURIComponent(id)}/extract`, {
      method: 'POST', body: JSON.stringify({ text, confidence }),
    }),
  recommendations: (id: string) => request<LensOption[]>(`/${encodeURIComponent(id)}/recommendations`),
  saveLenses: (id: string, codes: string[]) =>
    request<PrescriptionRecord>(`/${encodeURIComponent(id)}/lenses`, {
      method: 'PATCH', body: JSON.stringify({ codes }),
    }),
  lensOptions: () => request<LensOption[]>('/lens-options'),
  document: async (id: string) => {
    const response = await fetch(`${apiBaseUrl}/api/v1/prescriptions/files/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${accessToken()}` },
    });
    if (!response.ok) throw new Error(`Prescription document could not be loaded (${response.status}).`);
    return URL.createObjectURL(await response.blob());
  },
};
