export type ResumeValidationResult = {
  ok: boolean;
  error?: string;
  mimeType?: string;
  fileName?: string;
};

export function validateResumeFile(fileName: string, mimeType?: string): ResumeValidationResult {
  const normalizedName = (fileName ?? '').trim();

  if (!normalizedName) {
    return { ok: false, error: 'No file selected.' };
  }

  const extension = normalizedName.split('.').pop()?.toLowerCase();
  const supportedExtensions = ['pdf', 'docx'];
  const supportedMimeTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

  if (!extension || !supportedExtensions.includes(extension)) {
    return {
      ok: false,
      error: 'Unsupported file type. Please upload a PDF or DOCX resume.',
      fileName: normalizedName,
    };
  }

  if (mimeType && !supportedMimeTypes.includes(mimeType)) {
    return {
      ok: false,
      error: 'The selected document type is not supported for QuickHire resumes.',
      fileName: normalizedName,
      mimeType,
    };
  }

  return {
    ok: true,
    fileName: normalizedName,
    mimeType,
  };
}
