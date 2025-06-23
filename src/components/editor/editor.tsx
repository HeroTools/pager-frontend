import { Smile, SendHorizontal, CaseSensitive, Paperclip } from "lucide-react";
import Quill, { QuillOptions } from "quill";
import { Delta, Op } from "quill/core";
import hljs from "highlight.js";
import {
  RefObject,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";

import { cn } from "@/lib/utils";
import { EmojiPopover } from "../emoji-popover";
import { Hint } from "../hint";
import { Button } from "../ui/button";
import { toast } from "sonner";
import {
  ManagedAttachment,
  UploadedAttachment,
} from "@/features/file-upload/types";
import { useDeleteAttachment, useFileUpload } from "@/features/file-upload";
import AttachmentPreview from "./attachment-preview";
import validateFile from "@/lib/helpers/validate-file";

type EditorValue = {
  image: File | null;
  body: string;
  attachments: UploadedAttachment[];
};

interface EditorProps {
  variant?: "create" | "update";
  defaultValue?: Delta | Op[];
  disabled?: boolean;
  innerRef?: RefObject<Quill | null>;
  placeholder?: string;
  workspaceId: string;
  onCancel?: () => void;
  onSubmit: ({ image, body, attachments }: EditorValue) => Promise<any> | void;
  maxFiles?: number;
  maxFileSizeBytes?: number;
}

const Editor = ({
  variant = "create",
  defaultValue = [],
  disabled = false,
  innerRef,
  placeholder = "Write something...",
  workspaceId,
  onCancel,
  onSubmit,
  maxFiles = 10,
  maxFileSizeBytes = 20 * 1024 * 1024, // 20MB
}: EditorProps) => {
  const [image, setImage] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<ManagedAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);

  const isEmpty = useMemo(
    () =>
      !image &&
      attachments.length === 0 &&
      text.replace(/\s*/g, "").trim().length === 0,
    [text, image, attachments.length]
  );

  const hasUploadsInProgress = useMemo(
    () => attachments.some((att) => att.status === "uploading"),
    [attachments]
  );

  const activeUploadBatchRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const onSubmitRef = useRef(onSubmit);
  const placeholderRef = useRef(placeholder);
  const defaultValueRef = useRef(defaultValue);
  const disabledRef = useRef(disabled);
  const imageElementRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const attachmentsRef = useRef(attachments);
  const handleSubmitRef = useRef(handleSubmit);

  const { uploadMultipleFiles } = useFileUpload(workspaceId);
  const deleteAttachment = useDeleteAttachment();

  useLayoutEffect(() => {
    onSubmitRef.current = onSubmit;
    placeholderRef.current = placeholder;
    defaultValueRef.current = defaultValue;
    disabledRef.current = disabled;
    attachmentsRef.current = attachments;
    handleSubmitRef.current = handleSubmit;
  }, [
    onSubmit,
    placeholder,
    defaultValue,
    disabled,
    attachments,
    handleSubmit,
  ]);

  const handleFiles = useCallback(
    async (files: FileList) => {
      if (!uploadMultipleFiles) {
        toast.error("File upload not configured");
        return;
      }

      const fileArray = Array.from(files);

      if (attachments.length + fileArray.length > maxFiles) {
        toast.error(`Cannot upload more than ${maxFiles} files total.`);
        return;
      }

      const validationErrors = fileArray
        .map((file) => validateFile(file, maxFileSizeBytes))
        .filter((error) => error !== null);

      if (validationErrors.length > 0) {
        toast.error(validationErrors.join("\n"));
        return;
      }

      // Create batch ID to track this upload session
      const batchId = `batch-${Date.now()}-${Math.random()}`;
      activeUploadBatchRef.current = batchId;

      // Create initial attachment entries with unique IDs
      const fileIds = fileArray.map(
        () => `upload-${Date.now()}-${Math.random()}`
      );

      const initialAttachments: ManagedAttachment[] = fileArray.map(
        (file, index) => ({
          id: fileIds[index],
          originalFilename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
          publicUrl: "",
          uploadProgress: 0,
          status: "uploading",
          file, // Store file for preview
        })
      );

      setAttachments((prev) => {
        const newState = [...prev, ...initialAttachments];
        return newState;
      });

      try {
        // Use uploadMultipleFiles with proper progress tracking
        const results = await uploadMultipleFiles(
          fileArray,
          (fileIndex: number, progress: { percentage: number }) => {
            if (activeUploadBatchRef.current === batchId) {
              const targetId = fileIds[fileIndex];
              setAttachments((prev) =>
                prev.map((att) =>
                  att.id === targetId
                    ? { ...att, uploadProgress: progress.percentage }
                    : att
                )
              );
            }
          },
          3 // Max concurrent uploads
        );

        if (activeUploadBatchRef.current === batchId) {
          setAttachments((prev) => {
            const updatedAttachments = prev.map((att) => {
              const originalFileIndex = fileIds.indexOf(att.id);
              if (originalFileIndex === -1) return att;

              const result = results[originalFileIndex];

              if (result.status === "success") {
                return {
                  ...att,
                  id: result.attachmentId,
                  publicUrl: result.publicUrl,
                  uploadProgress: 100,
                  status: "completed",
                  file: undefined, // Clear the preview file from memory
                };
              } else {
                return {
                  ...att,
                  status: "error",
                  error: result.error,
                  file: undefined,
                };
              }
            });

            return updatedAttachments;
          });

          activeUploadBatchRef.current = null;
        }
      } catch (error) {
        console.error("Upload batch failed:", error);
        if (activeUploadBatchRef.current === batchId) {
          setAttachments((prev) =>
            prev.map((att) =>
              fileIds.includes(att.id)
                ? { ...att, status: "error", error: "Upload failed" }
                : att
            )
          );
          activeUploadBatchRef.current = null;
        }
      }
    },
    [attachments.length, maxFiles, uploadMultipleFiles]
  );

  const removeAttachment = async (attachmentId: string) => {
    const attachment = attachments.find((att) => att.id === attachmentId);
    if (!attachment) return;

    if (
      attachment.status === "completed" &&
      !attachmentId.startsWith("upload-") &&
      deleteAttachment
    ) {
      try {
        await deleteAttachment.mutateAsync({
          attachmentId,
          workspaceId,
        });
      } catch (error) {
        console.error("Failed to delete attachment:", error);
      }
    }

    setAttachments((prev) => {
      const newState = prev.filter((att) => att.id !== attachmentId);
      return newState;
    });
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (
      editorWrapperRef.current &&
      !editorWrapperRef.current.contains(e.relatedTarget as Node)
    ) {
      setIsDragging(false);
    }
  }, []);

  async function handleSubmit() {
    const quill = quillRef.current;
    if (!quill) return;

    if (hasUploadsInProgress) {
      toast.error("Please wait for all attachments to finish uploading.");
      return;
    }
    const failedAttachments = attachments.filter(
      (att) => att.status === "error"
    );
    if (failedAttachments.length > 0) {
      toast.error(
        "Some uploads failed. Please remove failed uploads or try again."
      );
      return;
    }

    const oldContents = quill.getContents();
    const oldText = quill.getText();
    const oldImage = image;
    const oldAttachments = attachments;
    const body = JSON.stringify(oldContents);

    try {
      const completedAttachments = attachments.filter((att) => !!att.publicUrl);

      const attachmentsForSubmit: UploadedAttachment[] =
        completedAttachments.map((att) => ({
          id: att.id,
          originalFilename: att.originalFilename,
          contentType: att.contentType,
          sizeBytes: att.sizeBytes,
          publicUrl: att.publicUrl,
          uploadProgress: att.uploadProgress,
          status: "completed" as const,
        }));

      const result = onSubmitRef.current({
        image: oldImage,
        body,
        attachments: attachmentsForSubmit,
      });

      quill.setText("");
      quill.setContents([]);
      setText("");
      setImage(null);
      setAttachments([]);
      activeUploadBatchRef.current = null;

      if (result instanceof Promise) {
        await result;
      }
    } catch (err) {
      quill.setContents(oldContents);
      setText(oldText);
      setImage(oldImage);
      setAttachments(oldAttachments);
      console.error("Send failed, rolled back:", err);
    }
  }

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const editorDiv = document.createElement("div");
    container.appendChild(editorDiv);

    const options: QuillOptions = {
      theme: "snow",
      placeholder: placeholderRef.current,
      modules: {
        syntax: { hljs },
        toolbar: [
          ["bold", "italic", "underline", "strike"],
          ["blockquote", "code-block"],
          [{ list: "ordered" }, { list: "bullet" }, "link"],
        ],
        keyboard: {
          bindings: {
            enterSubmit: {
              key: "Enter",
              handler: function (range, context) {
                const addedImage = imageElementRef.current?.files?.[0] || null;
                const currentText = quillRef.current?.getText() || "";

                const empty =
                  !addedImage &&
                  attachmentsRef.current.length === 0 &&
                  currentText.replace(/\s*/g, "").trim().length === 0;

                if (!empty) {
                  handleSubmitRef.current();
                  return false;
                }

                return true;
              },
            },
            linebreak: {
              key: "Enter",
              shiftKey: true,
              handler: function (range, context) {
                const quill = quillRef.current!;
                const index = range ? range.index : quill.getLength();
                quill.insertText(index, "\n");
                quill.setSelection(index + 1);
                return false;
              },
            },
          },
        },
      },
    };

    const quill = new Quill(editorDiv, options);
    quillRef.current = quill;
    quill.focus();
    if (innerRef) innerRef.current = quill;

    quill.setContents(defaultValueRef.current);
    setText(quill.getText());

    quill.on(Quill.events.TEXT_CHANGE, () => {
      setText(quill.getText());
    });

    return () => {
      quill.off(Quill.events.TEXT_CHANGE);
      container.innerHTML = "";
      quillRef.current = null;
      if (innerRef) innerRef.current = null;
    };
  }, []);

  const handleToolbarToggle = () => {
    setIsToolbarVisible((v) => !v);
    const toolbarEl = containerRef.current?.querySelector(".ql-toolbar");
    if (toolbarEl) toolbarEl.classList.toggle("hidden");
  };

  const handleEmojiSelect = (emoji: string) => {
    const quill = quillRef.current;
    const idx = quill?.getSelection()?.index || 0;
    quill?.insertText(idx, emoji);
  };

  return (
    <div className="flex flex-col">
      <input
        type="file"
        accept="image/*"
        ref={imageElementRef}
        onChange={(e) => setImage(e.target.files![0])}
        className="hidden"
      />
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        className="hidden"
      />

      <div
        ref={editorWrapperRef}
        className={cn(
          "flex flex-col border border-border-default rounded-md overflow-hidden focus-within:border-border-strong transition-all duration-200 relative",
          disabled && "opacity-50",
          isDragging && "border-primary bg-accent/50"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm z-50 flex items-center justify-center border-2 border-dashed border-primary rounded-md">
            <div className="text-center">
              <div className="text-lg font-medium text-primary mb-2">
                Drop files here
              </div>
              <div className="text-sm text-muted-foreground">
                Max {maxFiles} files, up to{" "}
                {Math.round(maxFileSizeBytes / 1024 / 1024)}MB each
              </div>
            </div>
          </div>
        )}

        <div ref={containerRef} className="h-full ql-custom"></div>

        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="px-2 pb-2">
            <div className="flex flex-wrap">
              {attachments.map((attachment) => (
                <AttachmentPreview
                  key={attachment.id}
                  attachment={attachment}
                  attachments={attachments}
                  workspaceId={workspaceId}
                  setAttachments={setAttachments}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex px-2 pb-2 z-5">
          <Hint
            label={isToolbarVisible ? "Hide formatting" : "Show formatting"}
          >
            <Button
              disabled={disabled}
              size="sm"
              variant="ghost"
              onClick={handleToolbarToggle}
            >
              <CaseSensitive className="size-4" />
            </Button>
          </Hint>
          <EmojiPopover onEmojiSelect={handleEmojiSelect}>
            <Button disabled={disabled} size="sm" variant="ghost">
              <Smile className="size-4" />
            </Button>
          </EmojiPopover>

          <Hint label="Attach files">
            <Button
              disabled={disabled}
              size="sm"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                attachments.length > 0 && "bg-accent text-accent-foreground"
              )}
            >
              <Paperclip className="size-4" />
              {attachments.length > 0 && (
                <span className="ml-1 text-xs bg-primary text-primary-foreground rounded-full px-1 min-w-4 h-4 flex items-center justify-center">
                  {attachments.length}
                </span>
              )}
            </Button>
          </Hint>

          {variant === "update" ? (
            <div className="ml-auto flex items-center gap-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                disabled={disabled}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSubmit}
                disabled={disabled || isEmpty || hasUploadsInProgress}
                className="bg-primary hover:bg-primary/80 text-primary-foreground"
              >
                Save
              </Button>
            </div>
          ) : (
            <Button
              disabled={disabled || isEmpty || hasUploadsInProgress}
              onClick={handleSubmit}
              className={cn(
                "ml-auto",
                isEmpty || hasUploadsInProgress
                  ? "text-muted-foreground"
                  : "bg-primary hover:bg-primary/80 text-primary-foreground"
              )}
              size="sm"
            >
              <SendHorizontal className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {variant === "create" && (
        <div
          className={cn(
            "p-2 text-[10px] text-muted-foreground flex justify-end opacity-0 transition",
            !isEmpty && "opacity-100"
          )}
        >
          <p>
            <strong>Shift + Return</strong> to add new line
          </p>
        </div>
      )}
    </div>
  );
};

export default Editor;
