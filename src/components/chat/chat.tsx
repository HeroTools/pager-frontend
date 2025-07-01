import { FC, useCallback, useEffect, useRef, useState, UIEvent } from "react";

import type { Message, Channel, Attachment } from "@/types/chat";
import { ChatHeader } from "./header";
import { ChatMessageList } from "./message-list";
import Editor from "@/components/editor/editor";
import { useParamIds } from "@/hooks/use-param-ids";
import type { ChannelMemberData } from "@/features/channels";
import type { UploadedAttachment } from "@/features/file-upload";
import type { CurrentUser } from "@/features/auth";
import { MediaViewerModal } from "@/components/media-viewer-modal";

interface ChatProps {
  channel: Channel;
  messages: Message[];
  currentUser: CurrentUser;
  chatType?: "conversation" | "channel";
  onLoadMore: () => void;
  hasMoreMessages: boolean;
  isLoadingMore: boolean;
  isLoading?: boolean;
  onSendMessage: (content: {
    body: string;
    image: File | null;
    attachments: UploadedAttachment[];
    plainText: string;
  }) => void;
  onEditMessage?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onReplyToMessage?: (messageId: string) => void;
  onReactToMessage?: (messageId: string, emoji: string) => void;
  onToggleChannelDetails?: () => void;
  typingUsers?: { id: string; name: string; avatar?: string }[];
  onInputChange?: (value: string) => void;
  onTypingSubmit?: () => void;
  members?: ChannelMemberData[];
}

export const Chat: FC<ChatProps> = ({
  channel,
  messages,
  currentUser,
  chatType,
  isLoading = false,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onReplyToMessage,
  onReactToMessage,
  onToggleChannelDetails,
  onLoadMore,
  hasMoreMessages,
  isLoadingMore,
  typingUsers,
  onInputChange,
  onTypingSubmit,
  members,
}) => {
  const { workspaceId } = useParamIds();
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false);
  const [mediaViewerAttachments, setMediaViewerAttachments] = useState<
    Attachment[]
  >([]);
  const [mediaViewerInitialIndex, setMediaViewerInitialIndex] = useState(0);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);

  const handleSendMessage = (content: {
    body: string;
    image: File | null;
    attachments: UploadedAttachment[];
    plainText: string;
  }) => {
    onSendMessage(content);
  };

  const handleEditMessage = (messageId: string) => {
    setEditingMessageId(messageId);
    onEditMessage?.(messageId);
  };

  const handleOpenMediaViewer = (message: Message, attachmentIndex: number) => {
    // Get all viewable attachments (images, videos, and documents)
    const viewableAttachments = message.attachments.filter((attachment) => {
      const mimeType = attachment.contentType || "";
      const filename = attachment.originalFilename || "";
      const extension = filename.split(".").pop()?.toLowerCase();

      return (
        attachment.contentType?.startsWith("image/") ||
        attachment.contentType?.startsWith("video/") ||
        mimeType.includes("pdf") ||
        mimeType.includes("document") ||
        mimeType.includes("spreadsheet") ||
        mimeType.includes("presentation") ||
        ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(
          extension || ""
        )
      );
    });

    if (viewableAttachments.length > 0) {
      setMediaViewerAttachments(viewableAttachments);
      setMediaViewerInitialIndex(attachmentIndex);
      setIsMediaViewerOpen(true);
    }
  };

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const c = messagesContainerRef.current;
    if (c) c.scrollTo({ top: c.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    if (shouldScrollToBottom) scrollToBottom();
  }, [messages, shouldScrollToBottom, scrollToBottom]);

  useEffect(() => {
    if (!shouldScrollToBottom) return;
    const c = messagesContainerRef.current;
    if (!c || typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver(() => {
      scrollToBottom("auto");
    });
    ro.observe(c);
    return () => ro.disconnect();
  }, [messages, shouldScrollToBottom, scrollToBottom]);

  useEffect(() => {
    if (!shouldScrollToBottom) return;
    const c = messagesContainerRef.current;
    if (!c) return;

    const imgs = Array.from(c.querySelectorAll("img"));

    const onImgLoad = () => {
      c.scrollTo({ top: c.scrollHeight, behavior: "auto" });
    };

    imgs.forEach((img) => {
      if (!img.complete) img.addEventListener("load", onImgLoad);
    });

    return () => {
      imgs.forEach((img) => img.removeEventListener("load", onImgLoad));
    };
  }, [messages, shouldScrollToBottom]);

  const handleScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      if (!messagesContainerRef.current) return;
      const c = messagesContainerRef.current!;

      if (c.scrollTop < 100 && hasMoreMessages && !isLoadingMore) {
        const prevH = c.scrollHeight;
        setShouldScrollToBottom(false);
        onLoadMore();
        setTimeout(() => {
          c.scrollTop = c.scrollHeight - prevH;
        }, 100);
      }
      setShouldScrollToBottom(
        c.scrollTop + c.clientHeight >= c.scrollHeight - 100
      );
    },
    [hasMoreMessages, isLoadingMore, onLoadMore]
  );

  return (
    <div className="flex flex-col h-full">
      <ChatHeader
        channel={channel}
        onToggleDetails={onToggleChannelDetails}
        members={members}
      />

      <ChatMessageList
        messages={messages}
        currentUser={currentUser}
        isLoading={isLoading}
        onEdit={handleEditMessage}
        onDelete={onDeleteMessage}
        onReply={onReplyToMessage}
        onReaction={onReactToMessage}
        containerRef={messagesContainerRef}
        onScroll={handleScroll}
      />

      <div className="p-4 border-t border-border-subtle">
        <Editor
          workspaceId={workspaceId}
          placeholder={`Message ${chatType === "channel" ? "#" : ""}${
            channel.name
          }`}
          onSubmit={handleSendMessage}
          disabled={isLoading}
          maxFiles={10}
          maxFileSizeBytes={20 * 1024 * 1024}
        />
      </div>

      <MediaViewerModal
        isOpen={isMediaViewerOpen}
        onClose={() => setIsMediaViewerOpen(false)}
        attachments={mediaViewerAttachments}
        initialIndex={mediaViewerInitialIndex}
      />
    </div>
  );
};
