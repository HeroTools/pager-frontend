import "quill/dist/quill.snow.css";

import {
  ImageIcon,
  Smile,
  XIcon,
  SendHorizontal,
  CaseSensitive,
  Paperclip,
} from "lucide-react";
import Quill, { QuillOptions } from "quill";
import { Delta, Op } from "quill/core";
import {
  RefObject,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils";
import Image from "next/image";
import { EmojiPopover } from "./emoji-popover";
import { Hint } from "./hint";
import { Button } from "./ui/button";
import AttachmentUploader from "@/features/file-upload/components/attachment-uploader";
import { toast } from "sonner";
import { UploadedAttachment } from "@/features/file-upload/types";

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
}: EditorProps) => {
  const [image, setImage] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);
  const [showAttachments, setShowAttachments] = useState(false);

  const isEmpty = useMemo(
    () =>
      !image &&
      attachments.length === 0 &&
      text.replace(/\s*/g, "").trim().length === 0,
    [text, image, attachments.length]
  );
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const onSubmitRef = useRef(onSubmit);
  const placeholderRef = useRef(placeholder);
  const defaultValueRef = useRef(defaultValue);
  const disabledRef = useRef(disabled);
  const imageElementRef = useRef<HTMLInputElement>(null);
  const quillRef = useRef<Quill | null>(null);

  useLayoutEffect(() => {
    onSubmitRef.current = onSubmit;
    placeholderRef.current = placeholder;
    defaultValueRef.current = defaultValue;
    disabledRef.current = disabled;
  });

  const handleSubmit = async () => {
    const quill = quillRef.current;
    if (!quill) return;

    // Check if any attachments are still uploading
    const uploadingAttachments = attachments.filter(
      (att) => att.status === "uploading"
    );
    if (uploadingAttachments.length > 0) {
      toast("Please wait for all attachments to finish uploading.");
      return;
    }

    const oldContents = quill.getContents();
    const oldText = quill.getText();
    const oldImage = image;
    const oldAttachments = attachments;
    const body = JSON.stringify(oldContents);

    try {
      const result = onSubmitRef.current({
        image: oldImage,
        body,
        attachments,
      });

      // Clear form
      quill.setText("");
      quill.setContents([]);
      setText("");
      setImage(null);
      setAttachments([]);
      setShowAttachments(false);

      if (result instanceof Promise) {
        await result;
      }
    } catch (err) {
      // Rollback on error
      quill.setContents(oldContents);
      setText(oldText);
      setImage(oldImage);
      setAttachments(oldAttachments);
      console.error("Send failed, rolled back:", err);
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const editorDiv = document.createElement("div");
    container.appendChild(editorDiv);

    const options: QuillOptions = {
      theme: "snow",
      placeholder: placeholderRef.current,
      modules: {
        toolbar: [
          ["bold", "italic", "strike"],
          ["link"],
          [{ list: "ordered" }, { list: "bullet" }],
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
                  attachments.length === 0 &&
                  currentText.replace(/\s*/g, "").trim().length === 0;

                if (!empty) {
                  handleSubmit();
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
  }, [innerRef, attachments.length]);

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

  const toggleAttachments = () => {
    setShowAttachments(!showAttachments);
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

      {/* Attachment Uploader */}
      {showAttachments && (
        <div className="mb-4 p-4 border border-border-default rounded-md bg-muted/30">
          <AttachmentUploader
            workspaceId={workspaceId}
            onAttachmentsChange={setAttachments}
            maxFiles={10}
            maxFileSizeBytes={20 * 1024 * 1024} // 10MB
          />
        </div>
      )}

      <div
        className={cn(
          "flex flex-col border border-border-default rounded-md overflow-hidden focus-within:border-border-strong transition",
          disabled && "opacity-50"
        )}
      >
        <div ref={containerRef} className="h-full ql-custom"></div>

        {/* Legacy single image support */}
        {!!image && (
          <div className="p-2">
            <div className="relative size-[62px] flex items-center justify-center group/image">
              <Hint label="Remove image">
                <button
                  onClick={() => {
                    setImage(null);
                    if (imageElementRef.current)
                      imageElementRef.current.value = "";
                  }}
                  className="hidden group-hover/image:flex rounded-full bg-primary/70 hover:bg-primary absolute -top-2.5 -right-2.5 text-primary-foreground size-6 z-4 border-2 items-center justify-center"
                >
                  <XIcon className="size-3.5" />
                </button>
              </Hint>
              <Image
                src={URL.createObjectURL(image)}
                alt="Uploaded"
                fill
                className="rounded-xl overflow-hidden object-cover"
              />
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
              onClick={toggleAttachments}
              className={cn(
                showAttachments && "bg-accent text-accent-foreground"
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

          {/* Legacy image button - keep for backward compatibility */}
          {variant === "create" && (
            <Hint label="Image">
              <Button
                disabled={disabled}
                size="sm"
                variant="ghost"
                onClick={() => imageElementRef.current?.click()}
              >
                <ImageIcon className="size-4" />
              </Button>
            </Hint>
          )}

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
                disabled={disabled || isEmpty}
                className="bg-primary hover:bg-primary/80 text-primary-foreground"
              >
                Save
              </Button>
            </div>
          ) : (
            <Button
              disabled={disabled || isEmpty}
              onClick={handleSubmit}
              className={cn(
                "ml-auto",
                isEmpty
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

      {!showAttachments && attachments.length > 0 && (
        <div className="mt-2 text-xs text-muted-foreground">
          {attachments.length} file{attachments.length !== 1 ? "s" : ""}{" "}
          attached
        </div>
      )}

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
