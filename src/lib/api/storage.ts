// Helpers for files served from object storage (product images)
import { t } from '@/i18n';

// Validates a picked image before upload (the API checks the file contents again)
export function checkImageFile(file: File, maxMb: number): string | null {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return t('{file}: only JPEG, PNG and WebP images can be uploaded', { file: file.name });
  }
  if (file.size > maxMb * 1024 * 1024) {
    return t('{file}: images can be at most {size} MB', { file: file.name, size: maxMb });
  }
  return null;
}

// Save a Blob as a download
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
