import { AlertTriangle, Loader, XIcon } from "lucide-react";
import dynamic from "next/dynamic";
import Quill from "quill";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  isToday,
  isYesterday,
  format,
  parseISO,
  differenceInMinutes,
} from "date-fns"; // Added differenceInMinutes

import { ChatMessage } from "@/components/chat/message";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import {
  useMessageOperations,
  useMessageReplies,
} from "@/features/messages/hooks/use-messages";
import { useParamIds } from "@/hooks/use-param-ids";
import { useUIStore } from "@/store/ui-store";
import { transformMessages } from "../helpers";
import { User } from "@/types/chat";

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
  timestamp: string; // Added timestamp to reflect transformed data
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

const formatDateLabel = (dateInput: string | Date): string => {
  const date = typeof dateInput === "string" ? parseISO(dateInput) : dateInput;

  if (isToday(date)) {
    return "Today";
  }
  if (isYesterday(date)) {
    return "Yesterday";
  }
  return format(date, "MMMM d, yyyy"); // Date-fns format string for "Month Day, Year"
};

export const Thread = ({ onClose }: ThreadProps) => {
  const {
    selectedThreadParentMessage: parentMessage,
    setThreadOpen,
    isThreadOpen,
  } = useUIStore();
  const { workspaceId, id: entityId, type } = useParamIds();
  const { user: currentUser } = useCurrentUser(); // Destructure currentUser here
  const {
    data = { replies: [] },
    isLoadingThread,
    threadError,
  } = useMessageReplies(workspaceId, parentMessage?.id, {
    limit: 50,
    entity_id: entityId,
    entity_type: type,
  });

  // Message operations
  const {
    createMessage,
    updateMessage,
    deleteMessage,
    addReaction,
    removeReaction,
  } = useMessageOperations(workspaceId, entityId, type);

  const editorRef = useRef<Quill | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [isPending, setIsPending] = useState(false);

  const replies = transformMessages(
    data?.replies || [],
    currentUser as unknown as User
  );

  // Sort replies chronologically (oldest first)
  const sortedReplies = [...replies].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const groupedMessages = sortedReplies.reduce(
    (groups: Record<string, ThreadMessage[]>, message: ThreadMessage) => {
      // FIX: Ensure message.timestamp is a Date object before formatting
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

      await createMessage.mutateAsync({
        body,
        attachments: [],
        parent_message_id: parentMessage?.id,
        thread_id: parentMessage?.thread_id || parentMessage?.id,
        message_type: "thread",
      });

      setEditorKey((prev) => prev + 1);
    } catch (error) {
      console.error("Failed to send thread reply:", error);
      toast.error("Failed to send reply. Please try again.");
    } finally {
      setIsPending(false);
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
      toast.error("Failed to add reaction. Please try again.");
    }
  };

  if (isLoadingThread) {
    return (
      <div className="h-full flex flex-col">
        <ThreadHeader onClose={onClose} title="Thread" />
        <div className="flex h-full items-center justify-center">
          <Loader className="size-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (threadError) {
    return (
      <div className="h-full flex flex-col">
        <ThreadHeader onClose={onClose} title="Thread" />
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
      <ThreadHeader onClose={onClose} title="Thread" />

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
              // hide replies
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
                    // FIX: Ensure timestamp is Date object for differenceInMinutes
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
                      prevMessage.user?.id === message.user?.id &&
                      prevMessageTime && // Ensure prevMessageTime exists
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
          placeholder="Reply..."
          key={editorKey}
          maxFiles={10}
          maxFileSizeBytes={20 * 1024 * 1024}
        />
      </div>
    </div>
  );
};
