import { AlertTriangle, Loader, XIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { toast } from "sonner";
import { format, parseISO, differenceInMinutes } from "date-fns";

import { ChatMessage } from "@/components/chat/message";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import {
  useMessageOperations,
  useMessageReplies,
} from "@/features/messages/hooks/use-messages";
import { useParamIds } from "@/hooks/use-param-ids";
import { useUIStore } from "@/store/ui-store";
import { formatDateLabel, transformMessages } from "../helpers";
import { useToggleReaction } from "@/features/reactions";
import { Message } from "@/types/chat";
import { useMessagesStore } from "@/features/messages/store/messages-store";
import { UploadedAttachment } from "@/features/file-upload/types";

const Editor = dynamic(() => import("@/components/editor/editor"), {
  ssr: false,
});

interface ThreadProps {
  onClose: () => void;
}

const TIME_THRESHOLD = 5; // minutes

interface ThreadHeaderProps {
  onClose: () => void;
  title: string;
}

const ThreadHeader = ({ onClose, title }: ThreadHeaderProps) => (
  <div className="flex justify-between items-center h-[49px] px-4 border-b border-border-subtle">
    <p className="text-lg font-bold">{title}</p>
    <Button onClick={onClose} size="iconSm" variant="ghost">
      <XIcon className="size-5 stroke-[1.5]" />
    </Button>
  </div>
);

// Helper function to check if a message ID is temporary/optimistic
const isOptimisticId = (id: string): boolean => {
  return id.startsWith("temp-");
};

export const Thread = ({ onClose }: ThreadProps) => {
  const { selectedThreadParentMessage: parentMessage } = useUIStore();
  const { isMessagePending } = useMessagesStore();
  const { workspaceId, id: entityId, type } = useParamIds();
  const { user: currentUser } = useCurrentUser(workspaceId);

  const { createMessage, updateMessage, deleteMessage } = useMessageOperations(
    workspaceId,
    entityId,
    type
  );

  const {
    data = { replies: [] },
    isLoadingThread,
    threadError,
  } = useMessageReplies(
    workspaceId,
    parentMessage?.id,
    parentMessage?.threadCount || 0,
    {
      limit: 50,
      entity_id: entityId,
      entity_type: type,
    }
  );
  const toggleReaction = useToggleReaction(workspaceId);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  const isParentOptimistic = parentMessage && isOptimisticId(parentMessage.id);
  const isWaitingForPersistence =
    isParentOptimistic && isMessagePending(parentMessage.id);

  const replies = transformMessages(data?.replies || [], currentUser);

  // Sort replies chronologically (oldest first)
  const sortedReplies = [...replies].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const groupedMessages = sortedReplies.reduce(
    (groups: Record<string, Message[]>, message: Message) => {
      const messageDate =
        typeof message.timestamp === "string"
          ? parseISO(message.timestamp)
          : message.timestamp;

      const dateKey = format(messageDate, "MMMM d, yyyy");
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
      return groups;
    },
    {} as Record<string, Message[]>
  );

  const handleSubmit = async (content: {
    body: string;
    attachments: UploadedAttachment[];
    plainText: string;
  }) => {
    if (!parentMessage || isWaitingForPersistence) {
      toast.error(
        "Please wait for the parent message to save before replying."
      );
      return;
    }

    try {
      await createMessage.mutateAsync({
        body: content.body,
        attachments: content.attachments,
        parent_message_id: parentMessage.id,
        thread_id: parentMessage.threadId || parentMessage.id,
        message_type: "thread",
        plain_text: content.plainText,
      });

      setEditorKey((prev) => prev + 1);
    } catch (error) {
      console.error("Failed to send thread reply:", error);
      toast.error("Failed to send reply. Please try again.");
    }
  };

  const handleEdit = async (messageId: string, newContent: string) => {
    try {
      await updateMessage.mutateAsync({
        messageId,
        data: { body: newContent },
      });
      setEditingId(null);
    } catch (error) {
      console.error("Failed to edit message:", error);
      toast.error("Failed to edit message. Please try again.");
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      await deleteMessage.mutateAsync(messageId);
    } catch (error) {
      console.error("Failed to delete message:", error);
      toast.error("Failed to delete message. Please try again.");
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      const message = [parentMessage, ...replies].find(
        (m) => m?.id === messageId
      );
      const existingReaction = message?.reactions?.find(
        (r) => r.value === emoji
      );
      const hasReacted = existingReaction?.users.some(
        (user) => user.id === currentUser?.id
      );
      await toggleReaction.mutateAsync({
        messageId,
        emoji,
        currentlyReacted: hasReacted || false,
      });
    } catch (error) {
      console.error("Failed to react to message:", error);
      toast.error("Failed to add reaction. Please try again.");
    }
  };

  if (isWaitingForPersistence || isLoadingThread) {
    return (
      <div className="h-full flex flex-col">
        <ThreadHeader onClose={onClose} title="Thread" />
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader className="size-5 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading thread...</p>
          </div>
        </div>
      </div>
    );
  }

  if (createMessage.isError || threadError || !parentMessage) {
    return (
      <div className="h-full flex flex-col">
        <ThreadHeader onClose={onClose} title="Thread" />
        <div className="flex flex-col gap-y-2 h-full items-center justify-center">
          <AlertTriangle className="size-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {createMessage.isError
              ? "Failed to save message"
              : threadError
              ? "Failed to load thread"
              : "Message not available"}
          </p>
          {createMessage.isError && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              Refresh page
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <ThreadHeader onClose={onClose} title="Thread" />

      <div className="flex-1 overflow-y-auto messages-scrollbar relative">
        <div className="flex flex-col">
          {/* Parent message at the top */}
          <div className="px-4 pt-4 pb-2 border-b border-border-subtle relative">
            <ChatMessage
              message={parentMessage}
              currentUser={currentUser}
              showAvatar={true}
              isCompact={false}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onReaction={handleReaction}
              hideReplies
              hideThreadButton
              isInThread
            />
          </div>

          {/* Thread replies */}
          <div className="px-4">
            {replies.length > 0 &&
              Object.entries(groupedMessages).map(([dateKey, messages]) => (
                <div key={dateKey}>
                  <div className="text-center my-4 relative">
                    <hr className="absolute top-1/2 left-0 right-0 border-t border-border-subtle" />
                    <span className="relative inline-block px-4 py-1 rounded-full text-xs border border-border-subtle bg-background shadow-sm">
                      {formatDateLabel(messages[0].timestamp)}
                    </span>
                  </div>
                  {messages.map((message, index) => {
                    const prevMessage = messages[index - 1];
                    const messageTime =
                      typeof message.timestamp === "string"
                        ? parseISO(message.timestamp)
                        : message.timestamp;
                    const prevMessageTime =
                      prevMessage && typeof prevMessage.timestamp === "string"
                        ? parseISO(prevMessage.timestamp)
                        : prevMessage?.timestamp;

                    const isCompact =
                      prevMessage &&
                      prevMessage.authorId === message.authorId &&
                      prevMessageTime &&
                      differenceInMinutes(messageTime, prevMessageTime) <
                        TIME_THRESHOLD;
                    return (
                      <ChatMessage
                        key={message.id}
                        message={message}
                        currentUser={currentUser}
                        showAvatar={true}
                        isCompact={isCompact}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onReaction={handleReaction}
                        hideReplies
                        hideThreadButton
                        isInThread
                      />
                    );
                  })}
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Editor at the bottom */}
      <div className="px-4 py-4 border-t border-border-subtle bg-background">
        <Editor
          workspaceId={workspaceId}
          onSubmit={handleSubmit}
          placeholder={
            isWaitingForPersistence
              ? "Waiting for message to save..."
              : "Reply..."
          }
          key={editorKey}
          maxFiles={10}
          maxFileSizeBytes={20 * 1024 * 1024}
        />
      </div>
    </div>
  );
};
