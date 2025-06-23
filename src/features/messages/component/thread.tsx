import dayjs from "dayjs";
import { AlertTriangle, Loader, XIcon } from "lucide-react";
import dynamic from "next/dynamic";
import Quill from "quill";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { ChatMessage } from "@/components/chat/message";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { useCurrentMember } from "@/features/members/hooks/use-members";
import {
  useMessageOperations,
  useMessageReplies,
} from "@/features/messages/hooks/use-messages";
import { useParamIds } from "@/hooks/use-param-ids";
import { useUIStore } from "@/store/ui-store";

const Editor = dynamic(() => import("@/components/editor/editor"), {
  ssr: false,
});

interface ThreadProps {
  messageId: string;
  onClose: () => void;
  // Add the parent message data since we already have it
  parentMessage: {
    id: string;
    body: string;
    attachment_id: string | null;
    workspace_member_id: string;
    created_at: string;
    updated_at: string | null;
    edited_at: string | null;
    thread_id?: string | null;
    user: {
      id: string;
      name: string;
      email: string;
      image: string | null;
    };
    attachment?: {
      id: string;
      url: string;
      content_type: string | null;
      size_bytes: number | null;
    };
    reactions?: Array<{
      id: string;
      value: string;
      count: number;
      users: Array<{
        id: string;
        name: string;
      }>;
    }>;
  };
}

interface ThreadMessage {
  id: string;
  body: string;
  attachment_id: string | null;
  workspace_member_id: string;
  created_at: string;
  updated_at: string | null;
  edited_at: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  attachment?: {
    id: string;
    url: string;
    content_type: string | null;
    size_bytes: number | null;
  };
  reactions?: Array<{
    id: string;
    value: string;
    count: number;
    users: Array<{
      id: string;
      name: string;
    }>;
  }>;
}

const TIME_THRESHOLD = 5;

const formatDateLabel = (dateStr: string) => {
  const date = dayjs(dateStr);
  if (date.isToday()) return "Today";
  if (date.isYesterday()) return "Yesterday";
  return date.format("MMMM D, YYYY");
};

export const Thread = ({ onClose }: ThreadProps) => {
  const {
    selectedThreadParentMessage: parentMessage,
    setThreadOpen,
    isThreadOpen,
  } = useUIStore();
  const { workspaceId, id: entityId } = useParamIds();
  const { user: currentUser } = useCurrentUser();
  const { data, isLoadingThread, threadError } = useMessageReplies(
    workspaceId,
    parentMessage?.id,
    {
      limit: 50,
      entity_id: entityId,
      entity_type: "channel",
    }
  );

  // Determine if this is a channel or conversation based on the URL
  const isChannel = entityId?.startsWith("c_");
  const channelId = isChannel ? entityId?.slice(2) : undefined;
  const conversationId = !isChannel ? entityId?.slice(2) : undefined;

  const workspaceMember = useCurrentMember(workspaceId);

  // Message operations
  const {
    createMessage,
    updateMessage,
    deleteMessage,
    addReaction,
    removeReaction,
  } = useMessageOperations(workspaceId, channelId, conversationId);

  const editorRef = useRef<Quill | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [isPending, setIsPending] = useState(false);

  const replies = data?.replies || [];

  // Sort replies chronologically (oldest first)
  const sortedReplies = [...replies].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const groupedMessages = sortedReplies.reduce(
    (groups: Record<string, ThreadMessage[]>, message: ThreadMessage) => {
      const date = new Date(message.created_at);
      const dateKey = dayjs(date).format("YYYY-MM-DD");
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
      return groups;
    },
    {} as Record<string, ThreadMessage[]>
  );

  const handleSubmit = async ({
    body,
    image,
  }: {
    body: string;
    image: File | null;
  }) => {
    try {
      setIsPending(true);
      editorRef.current?.enable(false);

      let attachment_ids: string[] = [];

      await createMessage.mutateAsync({
        body,
        attachments: attachment_ids,
        parent_message_id: parentMessage?.id,
        thread_id: parentMessage?.thread_id || parentMessage?.id, // Use existing thread_id or make this message the thread root
        message_type: "thread",
      });

      setEditorKey((prev) => prev + 1);
      toast.success("Reply sent!");
    } catch (error) {
      console.error("Failed to send thread reply:", error);
      toast.error("Failed to send reply");
    } finally {
      setIsPending(false);
      editorRef.current?.enable(true);
    }
  };

  const handleEdit = async (messageId: string, newContent: string) => {
    try {
      await updateMessage.mutateAsync({
        messageId,
        data: { body: newContent },
      });
      setEditingId(null);
      toast.success("Message updated!");
    } catch (error) {
      console.error("Failed to edit message:", error);
      toast.error("Failed to edit message");
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      await deleteMessage.mutateAsync(messageId);
      toast.success("Message deleted!");
    } catch (error) {
      console.error("Failed to delete message:", error);
      toast.error("Failed to delete message");
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      // Find the message to check current reaction state
      const message = [parentMessage, ...replies].find(
        (m) => m?.id === messageId
      );
      const existingReaction = message?.reactions?.find(
        (r) => r.value === emoji
      );
      const hasReacted = existingReaction?.users.some(
        (user) => user.id === currentUser?.id
      );

      if (hasReacted) {
        await removeReaction.mutateAsync({ messageId, emoji });
      } else {
        await addReaction.mutateAsync({ messageId, emoji });
      }
    } catch (error) {
      console.error("Failed to react to message:", error);
      toast.error("Failed to add reaction");
    }
  };

  if (isLoadingThread) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center h-[49px] px-4 border-b border-border-subtle">
          <p className="text-lg font-bold">Thread</p>
          <Button onClick={onClose} size="iconSm" variant="ghost">
            <XIcon className="size-5 stroke-[1.5]" />
          </Button>
        </div>
        <div className="flex h-full items-center justify-center">
          <Loader className="size-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (threadError) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center h-[49px] px-4 border-b border-border-subtle">
          <p className="text-lg font-bold">Thread</p>
          <Button onClick={onClose} size="iconSm" variant="ghost">
            <XIcon className="size-5 stroke-[1.5]" />
          </Button>
        </div>
        <div className="flex flex-col gap-y-2 h-full items-center justify-center">
          <AlertTriangle className="size-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Failed to load thread</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center h-[49px] px-4 border-b border-border-subtle">
        <p className="text-lg font-bold">Thread</p>
        <Button onClick={onClose} size="iconSm" variant="ghost">
          <XIcon className="size-5 stroke-[1.5]" />
        </Button>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto messages-scrollbar">
        <div className="flex flex-col">
          {/* Parent message at the top */}
          <div className="px-4 pt-4 pb-2 border-b border-border-subtle">
            <ChatMessage
              message={parentMessage}
              currentUser={currentUser}
              showAvatar={true}
              isCompact={false}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onReaction={handleReaction}
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
                      {formatDateLabel(dateKey)}
                    </span>
                  </div>
                  {messages.map((message, index) => {
                    const prevMessage = messages[index - 1];
                    const isCompact =
                      prevMessage &&
                      prevMessage.user?.id === message.user?.id &&
                      dayjs(message.created_at).diff(
                        dayjs(prevMessage.created_at),
                        "minute"
                      ) < TIME_THRESHOLD;
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
          onSubmit={handleSubmit}
          disabled={isPending || createMessage.isPending}
          placeholder="Reply..."
          key={editorKey}
          innerRef={editorRef}
        />
      </div>
    </div>
  );
};
