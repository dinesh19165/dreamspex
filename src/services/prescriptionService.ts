export type PrescriptionUpload = {
  file: File;
  previewUrl?: string;
};

export async function uploadPrescription(file: File): Promise<PrescriptionUpload> {
  return { file, previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined };
}

export async function extractPrescription(): Promise<null> {
  return null;
}