import { useMutation } from '@tanstack/react-query';
import { uploadApi } from './upload-api';

// Get upload URL
export const useGetUploadUrl = () => {
  return useMutation({
    mutationFn: async ({ fileName, fileType }: { fileName: string; fileType: string }) => {
      const response = await uploadApi.getUploadUrl(fileName, fileType);
      return response.data.data;
    },
  });
};

// Upload file
export const useUploadFile = () => {
  return useMutation({
    mutationFn: async ({ url, file }: { url: string; file: File }) => {
      await uploadApi.uploadFile(url, file);
    },
  });
}; 