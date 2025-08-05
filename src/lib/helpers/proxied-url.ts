export const getProxiedUrl = (storageUrl: string): string => {
  if (!storageUrl) return '';

  return `/api/files/proxy?storageUrl=${encodeURIComponent(storageUrl)}`;
};
