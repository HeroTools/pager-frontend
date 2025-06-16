import { useMutation } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import type { ApiResponse } from '@/types/api'

interface UploadUrl {
  url: string
  fields: Record<string, string>
}

export const useUpload = () => {
  const { callApi } = useApi()

  const getUploadUrl = useMutation({
    mutationFn: (data: { fileName: string; fileType: string }) =>
      callApi<ApiResponse<UploadUrl>>('/upload/url', 'POST', data),
  })

  const uploadFile = async (file: File) => {
    const { data: uploadUrl } = await getUploadUrl.mutateAsync({
      fileName: file.name,
      fileType: file.type,
    })

    const formData = new FormData()
    Object.entries(uploadUrl.fields).forEach(([key, value]) => {
      formData.append(key, value)
    })
    formData.append('file', file)

    const response = await fetch(uploadUrl.url, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error('Upload failed')
    }

    return uploadUrl.fields.key
  }

  return {
    uploadFile,
    isUploading: getUploadUrl.isPending,
  }
} 