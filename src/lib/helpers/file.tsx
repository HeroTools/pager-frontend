import { File, FileText, Archive } from "lucide-react";

export const getFileIcon = (filename: string) => {
  const extension = filename.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "pdf":
      return <FileText className="w-5 h-5 text-red-500" />;
    case "doc":
    case "docx":
      return <FileText className="w-5 h-5 text-blue-500" />;
    case "xls":
    case "xlsx":
      return <FileText className="w-5 h-5 text-green-500" />;
    case "ppt":
    case "pptx":
      return <FileText className="w-5 h-5 text-orange-500" />;
    case "zip":
    case "rar":
    case "7z":
      return <Archive className="w-5 h-5 text-purple-500" />;
    default:
      return <File className="w-5 h-5 text-muted-foreground" />;
  }
};

export const validateFile = (
  file: File,
  maxFileSizeBytes: number
): string | null => {
  if (file.size > maxFileSizeBytes) {
    return `File "${file.name}" is too large. Maximum size is ${Math.round(
      maxFileSizeBytes / 1024 / 1024
    )}MB.`;
  }

  const allowedTypes = [
    "image/",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument",
    "video/",
    "audio/",
    "text/",
    "application/zip",
  ];

  const isAllowedType = allowedTypes.some((type) => file.type.startsWith(type));
  if (!isAllowedType) {
    return `File type "${file.type}" is not supported.`;
  }

  return null;
};
