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
import { useGetMembers } from '@/features/members/hooks/use-members';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useTypingStatus } from '@/hooks/use-typing-status';
import {
  hasDeltaContent as checkDeltaContent,
  enrichDeltaWithMentions,
  getPlainTextFromDelta as getDeltaPlainText,
  validateFile,
} from '@/lib/helpers';
import { createMemberLookupMap } from '@/lib/helpers/members';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import AttachmentPreview from './attachment-preview';
import EmojiAutoComplete from './emoji-auto-complete';
import { GifSearchModal } from './gif-search-modal';
import { LinkDialog } from './link-dialog';
import MentionAutoComplete from './mention-auto-complete';
import MentionBlot from './mention-blot';
import SlashCommandAutoComplete from './slash-command-autocomplete';

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
  `(?:https?:\\/\\/)?(?:localhost(?::\\d{1,5})?|(?:[\\w-]+\\.)*[\\w-]+\\.(?:${TLDs.join('|')})\\b)(?:\\/[^\\s]*)?`,
  'i',
);
const AUTO_LINK_URL_REGEX = new RegExp(URL_REGEX.source, 'gi');
const BACKTICK_REGEX = /`([^`]+)`/g;

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
  const [hasEmbeds, setHasEmbeds] = useState(false);

  const isAgentChat = !!agentConversationId;
  const isMobile = useIsMobile();

  const { getDraft, setDraft, clearDraft } = useDraftsStore();
  const { setProfilePanelOpen } = useUIStore();
  const { data: members = [] } = useGetMembers(workspaceId);

  const memberLookup = useMemo(() => {
    const lookup = createMemberLookupMap(members);
    return lookup;
  }, [members]);
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

  const activeUploadBatchesRef = useRef<Map<string, string[]>>(new Map());
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

  const isEmpty = useMemo(() => {
    if (image || attachments.length > 0) return false;

    const quill = quillRef.current;
    if (!quill) {
      return text.trim().length === 0 && !hasEmbeds;
    }

    return !checkDeltaContent(quill.getContents());
  }, [text, image, attachments.length, hasEmbeds]);

  const hasUploadsInProgress = useMemo(
    () => attachments.some((att) => att.status === 'uploading'),
    [attachments],
  );

  // Use individual progress tracking for updates
  const progressTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastProgressUpdateRef = useRef<Map<string, number>>(new Map());

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
    const plainText = getPlainTextFromDelta(oldContents);
    const oldImage = image;
    const oldAttachments = attachments;
    const body = JSON.stringify(oldContents);

    try {
      const completedAttachments = attachments.filter((att) => !!att.storageUrl);

      const attachmentsForSubmit: UploadedAttachment[] = completedAttachments.map((att) => ({
        id: att.id,
        originalFilename: att.originalFilename,
        contentType: att.contentType,
        sizeBytes: att.sizeBytes,
        storageUrl: att.storageUrl,
        uploadProgress: att.uploadProgress,
        status: 'completed' as const,
      }));

      const result = onSubmitRef.current({
        image: oldImage,
        body,
        attachments: attachmentsForSubmit,
        plainText,
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
      setHasEmbeds(false);
      activeUploadBatchesRef.current.clear();
      progressTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      progressTimeoutsRef.current.clear();
      lastProgressUpdateRef.current.clear();

      if (variant === 'create') {
        stopTyping();
      }
    } catch (err) {
      console.error('Failed to submit message:', err);
      quill.setContents(oldContents);
      setText(plainText);
      setImage(oldImage);
      setAttachments(oldAttachments);

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
    clearDraft,
  ]);

  const handleSubmitRef = useRef(handleSubmit);

  const debouncedSetDraft = useDebouncedCallback(() => {
    if (!entityId || !entityType) return;

    const quill = quillRef.current;
    if (!quill) return;

    const contents = quill.getContents();

    if (!checkDeltaContent(contents)) {
      clearDraft(workspaceId, entityId, parentMessageId);
    } else {
      setDraft(
        workspaceId,
        entityId,
        JSON.stringify(contents),
        quill.getText().trim() || ' ', // Ensure plain text is not empty for mention-only drafts
        entityType,
        parentMessageId,
        parentAuthorName,
      );
    }
  }, 500);

  const checkForEmbeds = useCallback((quill: Quill) => {
    const contents = quill.getContents();
    const embedsPresent =
      contents.ops?.some(
        (op: any) =>
          op.insert && typeof op.insert === 'object' && (op.insert.image || op.insert.video),
      ) || false;
    setHasEmbeds(embedsPresent);
  }, []);

  const getPlainTextFromDelta = useCallback(
    (delta: Delta): string => getDeltaPlainText(delta, memberLookup),
    [memberLookup],
  );

  useLayoutEffect(() => {
    onSubmitRef.current = onSubmit;
    placeholderRef.current = placeholder;
    defaultValueRef.current = defaultValue;
    disabledRef.current = disabled;
    attachmentsRef.current = attachments;
    handleSubmitRef.current = handleSubmit;
  });

  // Update mention displays when members data loads
  useEffect(() => {
    if (!containerRef.current || memberLookup.size === 0) return;

    // Update all mention elements to show names instead of IDs
    const mentionElements = containerRef.current.querySelectorAll('.mention[data-member-id]');
    mentionElements.forEach((element) => {
      const memberId = element.getAttribute('data-member-id');
      if (memberId) {
        const memberName = memberLookup.get(memberId);
        if (memberName) {
          element.textContent = `@${memberName}`;
        }
      }
    });
  }, [memberLookup]);

  const createProgressHandler = useCallback((batchFileIds: string[]) => {
    return (fileIndex: number, progress: { percentage: number }) => {
      const fileKey = `${batchFileIds[0]}-${fileIndex}`;
      const now = Date.now();
      const lastUpdate = lastProgressUpdateRef.current.get(fileKey) || 0;

      const existingTimeout = progressTimeoutsRef.current.get(fileKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
      const shouldUpdateImmediately = progress.percentage === 100 || now - lastUpdate >= 100;

      const updateProgress = () => {
        lastProgressUpdateRef.current.set(fileKey, Date.now());

        setAttachments((prev) => {
          const targetId = batchFileIds[fileIndex];
          const targetIndex = prev.findIndex((att) => att.id === targetId);

          if (targetIndex === -1) return prev;

          const targetAttachment = prev[targetIndex];
          if (targetAttachment.uploadProgress === progress.percentage) {
            return prev; // No change needed
          }

          const updated = [...prev];
          updated[targetIndex] = {
            ...targetAttachment,
            uploadProgress: progress.percentage,
          };
          return updated;
        });

        progressTimeoutsRef.current.delete(fileKey);
      };

      if (shouldUpdateImmediately) {
        updateProgress();
      } else {
        const timeout = setTimeout(updateProgress, 80);
        progressTimeoutsRef.current.set(fileKey, timeout);
      }
    };
  }, []);

  const handleFiles = useCallback(
    async (files: FileList): Promise<void> => {
      if (isAgentChat) return;

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

      const fileIds = fileArray.map(() => `upload-${Date.now()}-${Math.random()}`);

      activeUploadBatchesRef.current.set(batchId, fileIds);

      const initialAttachments: ManagedAttachment[] = fileArray.map((file, index) => ({
        id: fileIds[index],
        originalFilename: file.name,
        contentType: file.type,
        sizeBytes: file.size,
        storageUrl: '',
        uploadProgress: 0,
        status: 'uploading',
        file,
      }));

      setAttachments((prev) => [...prev, ...initialAttachments]);

      try {
        const progressHandler = createProgressHandler(fileIds);
        const results = await uploadMultipleFiles(fileArray, progressHandler);

        if (activeUploadBatchesRef.current.has(batchId)) {
          const batchFileIds = activeUploadBatchesRef.current.get(batchId)!;

          setAttachments((prev) => {
            return prev.map((att) => {
              const fileIndex = batchFileIds.indexOf(att.id);
              if (fileIndex === -1 || fileIndex >= results.length) {
                return att;
              }

              const result = results[fileIndex];

              if (result.status === 'success') {
                return {
                  ...att,
                  id: result.attachmentId,
                  storageUrl: result.storageUrl,
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
          });

          activeUploadBatchesRef.current.delete(batchId);
          progressTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
          progressTimeoutsRef.current.clear();
          lastProgressUpdateRef.current.clear();
        }
      } catch (error) {
        if (activeUploadBatchesRef.current.has(batchId)) {
          const batchFileIds = activeUploadBatchesRef.current.get(batchId)!;

          setAttachments((prev) =>
            prev.map((att) =>
              batchFileIds.includes(att.id)
                ? { ...att, status: 'error', error: 'Upload failed' }
                : att,
            ),
          );

          activeUploadBatchesRef.current.delete(batchId);
          progressTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
          progressTimeoutsRef.current.clear();
          lastProgressUpdateRef.current.clear();
        }
      }
    },
    [
      attachments.length,
      maxFiles,
      uploadMultipleFiles,
      maxFileSizeBytes,
      isAgentChat,
      createProgressHandler,
    ],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent): void => {
      if (isAgentChat) return;

      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles, isAgentChat],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent): void => {
      if (isAgentChat) return;

      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    },
    [isAgentChat],
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent): void => {
      if (isAgentChat) return;

      e.preventDefault();
      e.stopPropagation();
      if (editorWrapperRef.current && !editorWrapperRef.current.contains(e.relatedTarget as Node)) {
        setIsDragging(false);
      }
    },
    [isAgentChat],
  );

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

  const handleGifSelect = useCallback(
    (gif: any) => {
      if (isAgentChat) return;

      const quill = quillRef.current;
      if (!quill) return;

      const selection = quill.getSelection();
      const index = selection?.index ?? quill.getLength() - 1;

      quill.insertEmbed(index, 'image', gif.media_formats.gif.url);
      quill.setSelection(index + 1);
      quill.focus();
    },
    [isAgentChat],
  );

  // Remove attachments from useEffect dependencies to prevent re-initialization
  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    // Register MentionBlot only if not already registered
    if (!Quill.imports['formats/mention']) {
      Quill.register(MentionBlot);
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

                const mentionDropdownOpen =
                  quillRef.current && (quillRef.current as any).mentionDropdownOpen;

                const commandDropdownOpen =
                  quillRef.current && (quillRef.current as any).commandDropdownOpen;

                if (emojiDropdownOpen || commandDropdownOpen || mentionDropdownOpen) {
                  return true;
                }

                const addedImage = imageElementRef.current?.files?.[0] || null;

                // Check if we have any content to send
                const hasAttachments = attachmentsRef.current.length > 0;
                const hasImage = !!addedImage;
                const quill = quillRef.current;
                const hasContent = quill ? checkDeltaContent(quill.getContents()) : false;
                const canSend = hasImage || hasAttachments || hasContent;

                if (canSend) {
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
                const quill = quillRef.current;
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

    // Load initial content (from draft or default)
    let initialContent: Delta | Op[] = defaultValueRef.current;
    const draft = entityId ? getDraft(workspaceId, entityId, parentMessageId) : undefined;

    if (draft?.content) {
      try {
        initialContent = enrichDeltaWithMentions(JSON.parse(draft.content), memberLookup);
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

        // Handle backtick inline code formatting
        const backtickMatches = [...lineText.matchAll(BACKTICK_REGEX)];
        for (const match of backtickMatches) {
          const fullMatch = match[0];
          const codeContent = match[1];
          const matchIndex = match.index ?? 0;
          const startIndex = lineStartIndex + matchIndex;

          // Check if this text is already formatted as code
          const format = quill.getFormat(startIndex, fullMatch.length);
          if (!format.code) {
            // Delete the backticks and format the content as inline code
            quill.deleteText(startIndex, fullMatch.length, 'silent');
            quill.insertText(startIndex, codeContent, { code: true }, 'silent');
            // Insert a space after the code to allow exiting
            quill.insertText(startIndex + codeContent.length, ' ', 'silent');
            // Remove code format from the space
            quill.formatText(startIndex + codeContent.length, 1, 'code', false, 'silent');
            // Position cursor at the space
            quill.setSelection(startIndex + codeContent.length + 1, 0, 'silent');
          }
        }

        // Re-get line after potential modifications
        const [updatedLine] = quill.getLine(selection.index);
        if (!updatedLine || !updatedLine.domNode) return;
        const updatedLineText = updatedLine.domNode.textContent ?? '';
        const updatedLineStartIndex = quill.getIndex(updatedLine);

        // Handle URL auto-linking
        const words = [...updatedLineText.matchAll(/\S+/g)];
        for (const wordMatch of words) {
          const word = wordMatch[0];
          const wordIndexInEditor = updatedLineStartIndex + (wordMatch.index ?? 0);
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

        const matches = [...updatedLineText.matchAll(AUTO_LINK_URL_REGEX)];
        for (const match of matches) {
          const url = match[0];
          const urlIndexInEditor = updatedLineStartIndex + (match.index ?? 0);
          const formats = quill.getFormat(urlIndexInEditor, url.length);
          if (formats.link) continue;

          const formattedUrl =
            url.startsWith('http') || url.startsWith('localhost') ? url : `https://` + url;
          quill.formatText(urlIndexInEditor, url.length, 'link', formattedUrl, 'silent');
        }
      }, 0);
    };

    const textChangeHandler = (_delta: Delta, _oldDelta: Delta, source: string) => {
      const currentText = quill.getText();
      setText(currentText);
      debouncedSetDraft();

      checkForEmbeds(quill);

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

    const handleMentionClick = (e: CustomEvent) => {
      const { memberId } = e.detail;
      setProfilePanelOpen(memberId);
    };

    quill.on(Quill.events.TEXT_CHANGE, textChangeHandler);
    quill.root.addEventListener('blur', handleBlur);
    quill.root.addEventListener('mentionClick', handleMentionClick as EventListener);

    // Mobile: Show toolbar only when text is selected
    if (isMobile) {
      // Hide toolbar initially on mobile
      const toolbarEl = containerRef.current?.querySelector('.ql-toolbar');
      if (toolbarEl) {
        toolbarEl.classList.add('hidden');
      }

      const handleSelectionChange = (range: any) => {
        const toolbarElement = containerRef.current?.querySelector('.ql-toolbar');
        if (!toolbarElement) return;

        if (range && range.length > 0) {
          // Show toolbar when text is selected
          toolbarElement.classList.remove('hidden');
        } else {
          // Hide toolbar when no selection
          toolbarElement.classList.add('hidden');
        }
      };

      quill.on(Quill.events.SELECTION_CHANGE, handleSelectionChange);
    }

    return () => {
      const progressTimeouts = progressTimeoutsRef.current;
      const lastProgressUpdate = lastProgressUpdateRef.current;
      progressTimeouts.forEach((timeout) => clearTimeout(timeout));
      progressTimeouts.clear();
      lastProgressUpdate.clear();

      quill.off(Quill.events.TEXT_CHANGE, textChangeHandler);
      quill.root.removeEventListener('blur', handleBlur);
      quill.root.removeEventListener('mentionClick', handleMentionClick as EventListener);

      if (isMobile) {
        quill.off(Quill.events.SELECTION_CHANGE);
      }

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
    isMobile,
    setProfilePanelOpen,
    checkForEmbeds,
    memberLookup,
    getDraft,
  ]);

  const handleToolbarToggle = useCallback((): void => {
    setIsToolbarVisible(!isToolbarVisible);
    const toolbarEl = containerRef.current?.querySelector('.ql-toolbar');
    if (toolbarEl) {
      toolbarEl.classList.toggle('hidden');
    }
  }, [isToolbarVisible]);

  const handleEmojiSelect = useCallback(
    (emoji: string): void => {
      if (isAgentChat) return;

      const quill = quillRef.current;
      if (!quill) return;

      const selection = quill.getSelection();
      const index = selection?.index ?? 0;
      quill.insertText(index, emoji);

      startTyping();
    },
    [startTyping, isAgentChat],
  );

  const handleLinkDialogClose = useCallback((): void => {
    setLinkSelection(null);
    setSelectedText('');
    setIsLinkDialogOpen(false);
  }, []);

  const handleCancel = useCallback(() => {
    if (variant === 'create') {
      stopTyping();
    }
    onCancel?.();
  }, [stopTyping, onCancel, variant]);

  return (
    <div className="flex flex-col">
      {!isAgentChat && (
        <>
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
            onChange={(e) => {
              if (e.target.files) {
                handleFiles(e.target.files);
                e.target.value = '';
              }
            }}
            className="hidden"
          />
        </>
      )}

      <div
        ref={editorWrapperRef}
        className={cn(
          'flex flex-col border border-border-default overflow-hidden focus-within:border-border-strong transition-all duration-200 relative',
          'rounded-t-md md:rounded-md',
          'md:max-h-[calc(100%-36px)]',
          !isAgentChat && isDragging && 'border-primary bg-accent/50',
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {!isAgentChat && isDragging && (
          <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm z-50 flex items-center justify-center border-2 border-dashed border-primary rounded-md">
            <div className="text-center">
              <div className="text-lg font-medium text-primary mb-2">Drop files here</div>
              <div className="text-sm text-muted-foreground">
                Max {maxFiles} files, up to {Math.round(maxFileSizeBytes / 1024 / 1024)}MB each
              </div>
            </div>
          </div>
        )}

        <div ref={containerRef} className="ql-custom max-h-80 overflow-y-auto" />

        {!isAgentChat && attachments.length > 0 && (
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

        <div className="flex px-2 pb-2 z-10 flex-shrink-0 items-center">
          {/* Desktop only: toolbar toggle button */}
          <div className="hidden md:block">
            <Hint label={isToolbarVisible ? 'Hide formatting' : 'Show formatting'}>
              <Button disabled={disabled} size="sm" variant="ghost" onClick={handleToolbarToggle}>
                <CaseSensitive className="size-4" />
              </Button>
            </Hint>
          </div>

          {!isAgentChat && (
            <>
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
            </>
          )}

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

      {variant === 'create' && !isMobile && (
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

      {!isAgentChat && (
        <>
          <EmojiAutoComplete quill={quillRef.current} containerRef={containerRef} />
          <MentionAutoComplete
            quill={quillRef.current}
            containerRef={containerRef}
            currentUserId={userId}
          />
        </>
      )}
      {!isAgentChat && (
        <SlashCommandAutoComplete
          quill={quillRef.current}
          containerRef={containerRef}
          onGifSelect={handleGifSelect}
        />
      )}
      <GifSearchModal />
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
