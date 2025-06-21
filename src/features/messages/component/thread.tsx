import dayjs from "dayjs";
import { AlertTriangle, Loader, XIcon } from "lucide-react";
import dynamic from "next/dynamic";
import Quill from "quill";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Message } from "@/features/conversations/components/message";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { useCurrentMember } from "@/features/members/hooks/use-members";
import { useMessageOperations } from "@/features/messages/hooks/use-messages";
import { useGetUploadUrl } from "@/features/file-upload/hooks/use-upload";
import { useParamIds } from "@/hooks/use-param-ids";
import { useQuery } from "@tanstack/react-query";
import { messagesApi } from "@/features/messages/api/messages-api";

const Editor = dynamic(() => import("@/components/editor"), { ssr: false });

interface ThreadProps {
  messageId: string;
  onClose: () => void;
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

export const Thread = ({ messageId, onClose }: ThreadProps) => {
  const { workspaceId, id: entityId } = useParamIds();
  const { user: currentUser } = useCurrentUser();

  // Determine if this is a channel or conversation based on the URL
  const isChannel = entityId?.startsWith("ch_");
  const channelId = isChannel ? entityId?.slice(2) : undefined;
  const conversationId = !isChannel ? entityId?.slice(2) : undefined;

  const workspaceMember = useCurrentMember(workspaceId);
  const generateUploadUrl = useGetUploadUrl();

  // Get the parent message
  const { data: parentMessage, isLoading: isLoadingParent } = useQuery({
    queryKey: ["message", workspaceId, messageId],
    queryFn: () => messagesApi.getMessage(workspaceId, messageId),
    enabled: !!(workspaceId && messageId),
  });

  // Get thread messages (messages with this messageId as parent or thread_id)
  const { data: threadMessages, isLoading: isLoadingThread } = useQuery({
    queryKey: ["thread", workspaceId, messageId],
    queryFn: () => messagesApi.getThreadMessages(workspaceId, messageId),
    enabled: !!(workspaceId && messageId),
  });

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

  // Group messages by date
  const groupedMessages = (threadMessages?.data || []).reduce(
    (groups, message) => {
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

      let attachment_id: string | undefined;

      if (image) {
        const url = await generateUploadUrl.mutateAsync({});

        const result = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": image.type },
          body: image,
        });

        if (!result.ok) {
          throw new Error("Failed to upload image");
        }

        const { storageId } = await result.json();
        attachment_id = storageId;
      }

      await createMessage.mutateAsync({
        body,
        attachment_id,
        parent_message_id: messageId,
        thread_id: parentMessage?.data.thread_id || messageId, // Use existing thread_id or make this message the thread root
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
      const message = [
        parentMessage?.data,
        ...(threadMessages?.data || []),
      ].find((m) => m?.id === messageId);
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

  if (isLoadingParent || isLoadingThread) {
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

  if (!parentMessage?.data) {
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
          <p className="text-sm text-muted-foreground">Message not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center h-[49px] px-4 border-b border-border-subtle">
        <p className="text-lg font-bold">Thread</p>
        <Button onClick={onClose} size="iconSm" variant="ghost">
          <XIcon className="size-5 stroke-[1.5]" />
        </Button>
      </div>
      <div className="flex-1 flex flex-col-reverse pb-4 overflow-y-auto messages-scrollbar">
        {Object.entries(groupedMessages || {}).map(([dateKey, messages]) => (
          <div key={dateKey}>
            <div className="text-center my-2 relative">
              <hr className="absolute top-1/2 left-0 right-0 border-t border-border-subtle" />
              <span className="relative inline-block px-4 py-1 rounded-full text-xs border border-border-subtle shadow-sm">
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
                <Message
                  key={message.id}
                  id={message.id}
                  memberId={message.workspace_member_id}
                  authorImage={message.user.image}
                  authorName={message.user.name}
                  reactions={message.reactions || []}
                  body={message.body}
                  image={message.attachment?.url}
                  updatedAt={message.updated_at}
                  createdAt={message.created_at}
                  threadCount={0} // Threads don't have nested threads
                  threadImage={undefined}
                  threadTimestamp={undefined}
                  threadName={undefined}
                  isEditing={editingId === message.id}
                  setEditingId={setEditingId}
                  isCompact={isCompact}
                  hideThreadButton={true}
                  isAuthor={
                    workspaceMember.data?.id === message.workspace_member_id
                  }
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onReaction={handleReaction}
                />
              );
            })}
          </div>
        ))}

        {/* Parent message at the bottom */}
        <Message
          id={parentMessage.data.id}
          memberId={parentMessage.data.workspace_member_id}
          authorImage={parentMessage.data.user.image}
          authorName={parentMessage.data.user.name}
          reactions={parentMessage.data.reactions || []}
          body={parentMessage.data.body}
          image={parentMessage.data.attachment?.url}
          updatedAt={parentMessage.data.updated_at}
          createdAt={parentMessage.data.created_at}
          isEditing={editingId === parentMessage.data.id}
          setEditingId={setEditingId}
          hideThreadButton={true}
          isAuthor={
            workspaceMember.data?.id === parentMessage.data.workspace_member_id
          }
          onEdit={handleEdit}
          onDelete={handleDelete}
          onReaction={handleReaction}
        />
      </div>
      <div className="px-4">
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
