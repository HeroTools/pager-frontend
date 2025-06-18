import "quill/dist/quill.snow.css";

import { ImageIcon, Smile, XIcon } from "lucide-react";
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
import { MdSend } from "react-icons/md";
import { PiTextAa } from "react-icons/pi";

import { cn } from "@/lib/utils";
import Image from "next/image";
import { EmojiPopover } from "./emoji-popover";
import { Hint } from "./hint";
import { Button } from "./ui/button";

type EditorValue = {
  image: File | null;
  body: string;
};

interface EditorProps {
  variant?: "create" | "update";
  defaultValue?: Delta | Op[];
  disabled?: boolean;
  innerRef?: RefObject<Quill | null>;
  placeholder?: string;
  onCancel?: () => void;
  onSubmit: ({ image, body }: EditorValue) => Promise<any> | void;
}

const Editor = ({
  variant = "create",
  defaultValue = [],
  disabled = false,
  innerRef,
  placeholder = "Write something...",
  onCancel,
  onSubmit,
}: EditorProps) => {
  const [image, setImage] = useState<File | null>(null);
  const [text, setText] = useState("");
  const isEmpty = useMemo(
    () => !image && text.replace(/\s*/g, "").trim().length === 0,
    [text, image]
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

    const oldContents = quill.getContents();
    const oldText = quill.getText();
    const oldImage = image;
    const body = JSON.stringify(oldContents);

    try {
      const result = onSubmitRef.current({ image: oldImage, body });
      quill.setText("");
      quill.setContents([]);
      setText("");
      setImage(null);

      if (result instanceof Promise) {
        await result;
      }
    } catch (err) {
      quill.setContents(oldContents);
      setText(oldText);
      setImage(oldImage);
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
  }, [innerRef]);

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
      <div
        className={cn(
          "flex flex-col border border-border-default rounded-md overflow-hidden focus-within:border-border-strong transition",
          disabled && "opacity-50"
        )}
      >
        <div ref={containerRef} className="h-full ql-custom"></div>
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
              <PiTextAa className="size-4" />
            </Button>
          </Hint>
          <EmojiPopover onEmojiSelect={handleEmojiSelect}>
            <Button disabled={disabled} size="sm" variant="ghost">
              <Smile className="size-4" />
            </Button>
          </EmojiPopover>
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
              <MdSend className="size-4" />
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
