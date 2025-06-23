const validateFile = (file: File, maxFileSizeBytes: number): string | null => {
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

export default validateFile;
