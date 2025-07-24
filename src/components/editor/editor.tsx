import hljs from 'highlight.js';
import { CaseSensitive, Paperclip, SendHorizontal, Smile } from 'lucide-react';
import Quill, { type Delta, type QuillOptions } from 'quill';
import type { Op } from 'quill/core';
import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import { useDebouncedCallback } from 'use-debounce';

import EmojiPicker from '@/components/emoji-picker';
import { Hint } from '@/components/hint';
import { Button } from '@/components/ui/button';
import { useDraftsStore } from '@/features/drafts/store/use-drafts-store';
import { useFileUpload } from '@/features/file-upload';
import type { ManagedAttachment, UploadedAttachment } from '@/features/file-upload/types';
import { useTypingStatus } from '@/hooks/use-typing-status';
import { validateFile } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import AttachmentPreview from './attachment-preview';
import EmojiAutoComplete from './emoji-auto-complete';
import { LinkDialog } from './link-dialog';

type EditorValue = {
  image: File | null;
  body: string;
  attachments: UploadedAttachment[];
  plainText: string;
};

interface EditorProps {
  variant?: 'create' | 'update';
  defaultValue?: Delta | Op[];
  disabled?: boolean;
  innerRef?: RefObject<Quill | null>;
  placeholder?: string;
  workspaceId: string;
  onCancel?: () => void;
  onSubmit: ({ image, body, attachments, plainText }: EditorValue) => Promise<void> | void;
  maxFiles?: number;
  maxFileSizeBytes?: number;
  userId: string;
  channelId?: string;
  conversationId?: string;
  agentConversationId?: string;
  parentMessageId?: string;
  parentAuthorName?: string;
}

const TLDs = ['com', 'org', 'net', 'edu', 'gov', 'io', 'co', 'dev', 'app', 'xyz', 'info', 'biz'];
const URL_REGEX = new RegExp(
  `(?:https?:\\/\\/)?(?:localhost(?:\\d{1,5})?|\\w[\\w-]*\\.(?:${TLDs.join('|')})\\b)(?:\\/[^\\s]*)?`,
  'i',
);
const AUTO_LINK_URL_REGEX = new RegExp(URL_REGEX.source, 'gi');

const Editor = ({
  variant = 'create',
  defaultValue = [],
  disabled = false,
  innerRef,
  placeholder = 'Write something...',
  workspaceId,
  onCancel,
  onSubmit,
  maxFiles = 10,
  maxFileSizeBytes = 20 * 1024 * 1024,
  userId,
  channelId,
  conversationId,
  agentConversationId,
  parentMessageId,
  parentAuthorName,
}: EditorProps) => {
  const [image, setImage] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<ManagedAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkSelection, setLinkSelection] = useState<{ index: number; length: number } | null>(
    null,
  );
  const [selectedText, setSelectedText] = useState('');

  const { getDraft, setDraft, clearDraft } = useDraftsStore();
  const { entityId, entityType } = useMemo(() => {
    if (channelId) return { entityId: channelId, entityType: 'channel' as const };
    if (conversationId) return { entityId: conversationId, entityType: 'conversation' as const };
    if (agentConversationId)
      return { entityId: agentConversationId, entityType: 'agent_conversation' as const };
    return { entityId: undefined, entityType: undefined };
  }, [channelId, conversationId, agentConversationId]);

  const { startTyping, stopTyping } = useTypingStatus({
    userId,
    channelId,
    conversationId,
    enabled: variant === 'create',
  });

  const isEmpty = useMemo(
    () => !image && attachments.length === 0 && text.replace(/\s*/g, '').trim().length === 0,
    [text, image, attachments.length],
  );

  const hasUploadsInProgress = useMemo(
    () => attachments.some((att) => att.status === 'uploading'),
    [attachments],
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

  const { uploadMultipleFiles } = useFileUpload(workspaceId);

  const handleSubmit = useCallback(async (): Promise<void> => {
    const quill = quillRef.current;
    if (!quill) {
      return;
    }

    if (hasUploadsInProgress) {
      toast.error('Please wait for all attachments to finish uploading.');
      return;
    }
    const failedAttachments = attachments.filter((att) => att.status === 'error');
    if (failedAttachments.length > 0) {
      toast.error('Some uploads failed. Please remove failed uploads or try again.');
      return;
    }

    const oldContents = quill.getContents();
    const oldText = quill.getText();
    const oldImage = image;
    const oldAttachments = attachments;
    const body = JSON.stringify(oldContents);

    try {
      const completedAttachments = attachments.filter((att) => !!att.publicUrl);

      const attachmentsForSubmit: UploadedAttachment[] = completedAttachments.map((att) => ({
        id: att.id,
        originalFilename: att.originalFilename,
        contentType: att.contentType,
        sizeBytes: att.sizeBytes,
        publicUrl: att.publicUrl,
        uploadProgress: att.uploadProgress,
        status: 'completed' as const,
      }));

      const result = onSubmitRef.current({
        image: oldImage,
        body,
        attachments: attachmentsForSubmit,
        plainText: oldText,
      });

      if (result instanceof Promise) {
        await result;
      }

      if (entityId) {
        clearDraft(workspaceId, entityId, parentMessageId);
      }

      quill.setText('');
      quill.setContents([]);
      setText('');
      setImage(null);
      setAttachments([]);
      activeUploadBatchRef.current = null;

      if (variant === 'create') {
        stopTyping();
      }
    } catch (err) {
      // Restore state on error
      quill.setContents(oldContents);
      setText(oldText);
      setImage(oldImage);
      setAttachments(oldAttachments);

      // Stop typing on error as well since the send failed
      if (variant === 'create') {
        stopTyping();
      }
    }
  }, [
    hasUploadsInProgress,
    attachments,
    image,
    stopTyping,
    variant,
    entityId,
    workspaceId,
    parentMessageId,
  ]);

  const handleSubmitRef = useRef(handleSubmit);

  const debouncedSetDraft = useDebouncedCallback(() => {
    if (entityId && entityType) {
      const quill = quillRef.current;
      if (quill) {
        const value = JSON.stringify(quill.getContents());
        if (quill.getText().trim().length === 0) {
          clearDraft(workspaceId, entityId, parentMessageId);
        } else {
          setDraft(
            workspaceId,
            entityId,
            value,
            quill.getText().trim(),
            entityType,
            parentMessageId,
            parentAuthorName,
          );
        }
      }
    }
  }, 500);

  useLayoutEffect(() => {
    onSubmitRef.current = onSubmit;
    placeholderRef.current = placeholder;
    defaultValueRef.current = defaultValue;
    disabledRef.current = disabled;
    attachmentsRef.current = attachments;
    handleSubmitRef.current = handleSubmit;
  }, [onSubmit, placeholder, defaultValue, disabled, attachments, handleSubmit]);

  const handleFiles = useCallback(
    async (files: FileList): Promise<void> => {
      if (!uploadMultipleFiles) {
        toast.error('File upload not configured');
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
        toast.error(validationErrors.join('\n'));
        return;
      }

      const batchId = `batch-${Date.now()}-${Math.random()}`;
      activeUploadBatchRef.current = batchId;

      const fileIds = fileArray.map(() => `upload-${Date.now()}-${Math.random()}`);

      const initialAttachments: ManagedAttachment[] = fileArray.map((file, index) => ({
        id: fileIds[index],
        originalFilename: file.name,
        contentType: file.type,
        sizeBytes: file.size,
        publicUrl: '',
        uploadProgress: 0,
        status: 'uploading',
        file,
      }));

      setAttachments((prev) => [...prev, ...initialAttachments]);

      try {
        const results = await uploadMultipleFiles(
          fileArray,
          (fileIndex: number, progress: { percentage: number }) => {
            if (activeUploadBatchRef.current === batchId) {
              const targetId = fileIds[fileIndex];
              setAttachments((prev) =>
                prev.map((att) =>
                  att.id === targetId ? { ...att, uploadProgress: progress.percentage } : att,
                ),
              );
            }
          },
        );

        if (activeUploadBatchRef.current === batchId) {
          setAttachments((prev) => {
            const updatedAttachments: ManagedAttachment[] = prev.map((att) => {
              const originalFileIndex = fileIds.indexOf(att.id);
              if (originalFileIndex === -1) {
                return att;
              }

              const result = results[originalFileIndex];

              if (result.status === 'success') {
                return {
                  ...att,
                  id: result.attachmentId,
                  publicUrl: result.publicUrl,
                  uploadProgress: 100,
                  status: 'completed' as const,
                  file: undefined,
                };
              } else {
                return {
                  ...att,
                  status: 'error' as const,
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
        if (activeUploadBatchRef.current === batchId) {
          setAttachments((prev) =>
            prev.map((att) =>
              fileIds.includes(att.id) ? { ...att, status: 'error', error: 'Upload failed' } : att,
            ),
          );
          activeUploadBatchRef.current = null;
        }
      }
    },
    [attachments.length, maxFiles, uploadMultipleFiles, maxFileSizeBytes],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent): void => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    if (editorWrapperRef.current && !editorWrapperRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleLinkFormat = useCallback(
    (text: string, url: string, range?: { index: number; length: number }): void => {
      const quill = quillRef.current;
      if (!quill) return;

      const targetRange = range || quill.getSelection();
      if (!targetRange) return;

      const { index, length } = targetRange;

      if (length > 0) {
        quill.deleteText(index, length);
      }

      quill.insertText(index, text, 'link', url);

      setLinkSelection(null);
      setIsLinkDialogOpen(false);
    },
    [],
  );

  const handleLinkSave = useCallback(
    (text: string, url: string): void => {
      if (!linkSelection) return;
      handleLinkFormat(text, url, linkSelection);
    },
    [linkSelection, handleLinkFormat],
  );

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const container = containerRef.current;
    const editorDiv = document.createElement('div');
    container.appendChild(editorDiv);

    const options: QuillOptions = {
      theme: 'snow',
      placeholder: placeholderRef.current,
      modules: {
        syntax: { hljs },
        toolbar: {
          container: [
            ['bold', 'italic', 'underline', 'strike'],
            ['blockquote', 'code-block'],
            [{ list: 'ordered' }, { list: 'bullet' }, 'link'],
          ],
          handlers: {
            link: function () {
              const range = this.quill.getSelection();
              if (range) {
                const selectedText = this.quill.getText(range.index, range.length);
                setLinkSelection({ index: range.index, length: range.length });
                setSelectedText(selectedText);
                setIsLinkDialogOpen(true);
              }
            },
          },
        },
        keyboard: {
          bindings: {
            enterSubmit: {
              key: 'Enter',
              handler(): boolean {
                const emojiDropdownOpen =
                  quillRef.current && (quillRef.current as any).emojiDropdownOpen;
                if (emojiDropdownOpen) {
                  return true;
                }

                const addedImage = imageElementRef.current?.files?.[0] || null;
                const currentText = quillRef.current?.getText() || '';

                const empty =
                  !addedImage &&
                  attachmentsRef.current.length === 0 &&
                  currentText.replace(/\s*/g, '').trim().length === 0;

                if (!empty) {
                  handleSubmitRef.current();
                  return false;
                }

                return true;
              },
            },
            linebreak: {
              key: 'Enter',
              shiftKey: true,
              handler(range: unknown): boolean {
                const quill = quillRef.current!;
                const rangeObj = range as { index?: number } | null;
                const index = rangeObj?.index ?? quill.getLength();
                quill.insertText(index, '\n');
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
    if (innerRef) {
      innerRef.current = quill;
    }

    const draft = entityId ? getDraft(workspaceId, entityId, parentMessageId) : undefined;
    let initialContent: Delta | Op[] = defaultValueRef.current;
    if (draft?.content) {
      try {
        initialContent = JSON.parse(draft.content);
      } catch (e) {
        console.error('Error parsing draft content', e);
      }
    }
    quill.setContents(initialContent, 'silent');
    setText(quill.getText());

    quill.root.addEventListener(
      'paste',
      (e: ClipboardEvent) => {
        const selection = quill.getSelection();

        if (!selection || selection.length === 0) {
          return;
        }

        const clipboardData = e.clipboardData;
        if (!clipboardData) {
          return;
        }

        const pastedData = clipboardData.getData('text/plain');

        if (URL_REGEX.test(pastedData)) {
          e.preventDefault();
          e.stopImmediatePropagation();

          quill.formatText(selection.index, selection.length, 'link', pastedData);
          quill.setSelection(selection.index + selection.length, 0);
        }
      },
      true,
    );

    const handleTextChange = () => {
      setTimeout(() => {
        const selection = quill.getSelection();
        if (!selection) return;

        const [line] = quill.getLine(selection.index);
        if (!line || !line.domNode) return;
        const lineText = line.domNode.textContent ?? '';
        const lineStartIndex = quill.getIndex(line);

        const words = [...lineText.matchAll(/\S+/g)];
        for (const wordMatch of words) {
          const word = wordMatch[0];
          const wordIndexInEditor = lineStartIndex + (wordMatch.index ?? 0);
          const format = quill.getFormat(wordIndexInEditor, word.length);

          const linkValue = format.link;
          if (linkValue && typeof linkValue === 'string') {
            const probablyAutoLink = linkValue.includes(word);
            if (probablyAutoLink) {
              const isStillValid = new RegExp(`^${URL_REGEX.source}$`, 'i').test(word);
              if (!isStillValid) {
                quill.formatText(wordIndexInEditor, word.length, 'link', false, 'silent');
              }
            }
          }
        }

        const matches = [...lineText.matchAll(AUTO_LINK_URL_REGEX)];
        for (const match of matches) {
          const url = match[0];
          const urlIndexInEditor = lineStartIndex + (match.index ?? 0);
          const formats = quill.getFormat(urlIndexInEditor, url.length);
          if (formats.link) continue;

          const formattedUrl =
            url.startsWith('http') || url.startsWith('localhost') ? url : `https://` + url;
          quill.formatText(urlIndexInEditor, url.length, 'link', formattedUrl, 'silent');
        }
      }, 0);
    };

    const textChangeHandler = (delta: Delta, oldDelta: Delta, source: string) => {
      const currentText = quill.getText();
      setText(currentText);
      debouncedSetDraft();

      if (source === 'user') {
        handleTextChange();

        if (variant === 'create') {
          if (currentText.trim().length > 0) {
            startTyping();
          } else {
            stopTyping();
          }
        }
      }
    };

    const handleBlur = () => {
      if (variant === 'create') {
        stopTyping();
      }
    };

    quill.on(Quill.events.TEXT_CHANGE, textChangeHandler);
    quill.root.addEventListener('blur', handleBlur);

    if (entityId) {
      const draft = getDraft(workspaceId, entityId, parentMessageId);
      if (draft) {
        try {
          const delta = JSON.parse(draft.content);
          quill.setContents(delta, 'silent');
        } catch (e) {
          console.error('Error parsing draft content', e);
        }
      }
    }

    return () => {
      quill.off(Quill.events.TEXT_CHANGE, textChangeHandler);
      quill.root.removeEventListener('blur', handleBlur);

      // Ensure typing is stopped on cleanup
      if (variant === 'create') {
        stopTyping();
      }

      container.innerHTML = '';
      quillRef.current = null;
      if (innerRef) {
        innerRef.current = null;
      }
    };
  }, [
    variant,
    innerRef,
    entityId,
    parentMessageId,
    startTyping,
    stopTyping,
    debouncedSetDraft,
    workspaceId,
  ]);

  const handleToolbarToggle = useCallback((): void => {
    setIsToolbarVisible(!isToolbarVisible);
    const toolbarEl = containerRef.current?.querySelector('.ql-toolbar');
    if (toolbarEl) {
      toolbarEl.classList.toggle('hidden');
    }
  }, []);

  const handleEmojiSelect = useCallback(
    (emoji: string): void => {
      const quill = quillRef.current;
      if (!quill) return;

      const selection = quill.getSelection();
      const index = selection?.index ?? 0;
      quill.insertText(index, emoji);

      // Start typing after emoji insertion
      startTyping();
    },
    [startTyping],
  );

  const handleLinkDialogClose = useCallback((): void => {
    setLinkSelection(null);
    setSelectedText('');
    setIsLinkDialogOpen(false);
  }, []);

  const handleCancel = useCallback(() => {
    if (variant === 'create') {
      stopTyping(); // Ensure typing is stopped when canceling
    }
    onCancel?.();
  }, [stopTyping, onCancel, variant]);

  return (
    <div className="flex flex-col">
      <input
        type="file"
        accept="image/*"
        ref={imageElementRef}
        onChange={(e) => setImage(e.target.files?.[0] || null)}
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
          'flex flex-col border rounded-md overflow-hidden focus-within:border-ring transition-all duration-200 relative max-h-[calc(100%-36px)]',
          isDragging && 'border-primary bg-accent/50',
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {isDragging && (
          <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm z-50 flex items-center justify-center border-2 border-dashed border-primary rounded-md">
            <div className="text-center">
              <div className="text-lg font-medium text-primary mb-2">Drop files here</div>
              <div className="text-sm text-muted-foreground">
                Max {maxFiles} files, up to {Math.round(maxFileSizeBytes / 1024 / 1024)}MB each
              </div>
            </div>
          </div>
        )}

        <div ref={containerRef} className="h-full ql-custom max-h-80 overflow-y-auto" />

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
          <Hint label={isToolbarVisible ? 'Hide formatting' : 'Show formatting'}>
            <Button disabled={disabled} size="sm" variant="ghost" onClick={handleToolbarToggle}>
              <CaseSensitive className="size-4" />
            </Button>
          </Hint>
          <EmojiPicker
            onSelect={handleEmojiSelect}
            trigger={
              <Button disabled={disabled} size="sm" variant="ghost">
                <Smile className="size-4" />
              </Button>
            }
          />

          <Hint label="Attach files">
            <Button
              disabled={disabled}
              size="sm"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              className={cn(attachments.length > 0 && 'bg-accent text-accent-foreground')}
            >
              <Paperclip className="size-4" />
              {attachments.length > 0 && (
                <span className="ml-1 text-xs bg-primary text-primary-foreground rounded-full px-1 min-w-4 h-4 flex items-center justify-center">
                  {attachments.length}
                </span>
              )}
            </Button>
          </Hint>

          {variant === 'update' ? (
            <div className="ml-auto flex items-center gap-x-2">
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={disabled}>
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
                'ml-auto',
                isEmpty || hasUploadsInProgress
                  ? 'text-muted-foreground'
                  : 'bg-primary hover:bg-primary/80 text-primary-foreground',
              )}
              size="sm"
            >
              <SendHorizontal className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {variant === 'create' && (
        <div
          className={cn(
            'p-2 pb-0 text-[10px] text-muted-foreground flex justify-end opacity-0 transition',
            !isEmpty && 'opacity-100',
          )}
        >
          <p>
            <strong>Shift + Return</strong> to add new line
          </p>
        </div>
      )}

      <EmojiAutoComplete quill={quillRef.current} containerRef={containerRef} />
      <LinkDialog
        isOpen={isLinkDialogOpen}
        onClose={handleLinkDialogClose}
        onSave={handleLinkSave}
        selectedText={selectedText}
      />
    </div>
  );
};

export default Editor;
