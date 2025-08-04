import type { Attachment } from '@/types/chat';
import { getProxiedUrl } from './proxied-url';

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const downloadFile = async (storageUrl: string, filename: string): Promise<void> => {
  try {
    const proxiedUrl = getProxiedUrl(storageUrl);
    const response = await fetch(proxiedUrl);

    if (!response.ok) throw new Error('Download failed');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download failed:', error);
    const proxiedUrl = getProxiedUrl(storageUrl);
    window.open(proxiedUrl, '_blank');
  }
};

export const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const isDocumentFile = (attachment: Attachment): boolean => {
  const mimeType = attachment.contentType || '';
  const filename = attachment.originalFilename || '';

  const documentMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
  ];

  if (documentMimeTypes.includes(mimeType)) return true;

  if (
    mimeType.includes('pdf') ||
    mimeType.includes('document') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('presentation') ||
    mimeType.includes('officedocument') ||
    mimeType.includes('msword') ||
    mimeType.includes('ms-excel') ||
    mimeType.includes('ms-powerpoint')
  ) {
    return true;
  }

  return /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i.test(filename);
};

export const ATTACHMENT_CONFIG = {
  SINGLE: {
    image: { maxWidthClass: 'max-w-md', maxHeightClass: 'max-h-96' },
    video: { maxWidth: 'max-w-md', maxHeight: 'max-h-96', height: 'h-auto', aspectRatio: 'auto' },
  },
  MULTI: {
    image: { widthClass: 'w-48', heightClass: 'h-32' },
    video: { maxWidth: 'w-48', maxHeight: 'h-32', height: 'h-32', aspectRatio: '3/2' },
  },
  THREAD: {
    image: { widthClass: 'w-40', heightClass: 'h-28' },
    video: { maxWidth: 'w-40', maxHeight: 'h-28', height: 'h-28', aspectRatio: '3/2' },
  },
} as const;

export const getAttachmentConfig = (isSingle: boolean, isThread: boolean) => {
  if (isThread) return ATTACHMENT_CONFIG.THREAD;
  return isSingle ? ATTACHMENT_CONFIG.SINGLE : ATTACHMENT_CONFIG.MULTI;
};
