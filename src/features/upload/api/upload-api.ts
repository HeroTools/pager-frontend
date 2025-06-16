import { AxiosResponse } from 'axios';
import { axiosInstance } from '@/lib/axios';

export interface UploadResponse {
  success: boolean;
  data: {
    url: string;
    key: string;
  };
  error?: string;
}

export const uploadApi = {
  getUploadUrl: (fileName: string, fileType: string): Promise<AxiosResponse<UploadResponse>> => {
    return axiosInstance.post('/upload/url', { fileName, fileType });
  },

  uploadFile: async (url: string, file: File): Promise<void> => {
    await axiosInstance.put(url, file, {
      headers: {
        'Content-Type': file.type,
      },
    });
  },
}; 