import dayjs from "dayjs";
import { AlertTriangle, Loader, XIcon } from "lucide-react";
import dynamic from "next/dynamic";
import Quill from "quill";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Message } from "@/components/Message";
import { Button } from "@/components/ui/button";
import { useCurrentMember } from "@/features/members/api/useCurrentMember";
import { useGenerateUploadUrl } from "@/features/upload/api/useGenerateUploadUrl";
import { useChannelId } from "@/hooks/useChannelId";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useCreateMessage } from "../api/useCreateMessage";
import { useGetMessage } from "../api/useGetMessage";
import { useGetMessages } from "../api/useGetMessages";

const Editor = dynamic(() => import("@/components/Editor"), { ssr: false });

interface ThreadProps {
  messageId: Id<"messages">;
  onClose: () => void;
}

type CreateMessageValues = {
  channelId: Id<"channels">;
  workspaceId: Id<"workspaces">;
  parentMessageId: Id<"messages">;
  body: string;
  image?: Id<"_storage">;
};

const TIME_THRESHOLD = 5;

const formatDateLabel = (dateStr: string) => {
  const date = dayjs(dateStr, "YYYY-MM-DD");
  if (date.isToday()) return "Today";
  if (date.isYesterday()) return "Yesterday";
  return ""; // TODO
};

export const Thread = ({ messageId, onClose }: ThreadProps) => {
  const workspaceId = useWorkspaceId();
  const channelId = useChannelId();
  const getMessage = useGetMessage({ id: messageId });
  const getMessages = useGetMessages({
    channelId,
    parentMessageId: messageId,
  });
  const currentMember = useCurrentMember({ workspaceId });
  const createMessage = useCreateMessage();
  const generateUploadUrl = useGenerateUploadUrl();

  const editorRef = useRef<Quill | null>(null);

  const [editingId, setEditingId] = useState<Id<"messages"> | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [isPending, setIsPending] = useState(false);

  const groupedMessages = getMessages.results.reduce(
    (groups, message) => {
      const date = new Date(message._creationTime);
      const dateKey = dayjs(date).format("YYYY-MM-DD");
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].unshift(message);
      return groups;
    },
    {} as Record<string, (typeof api.messages.get._returnType)["page"]>
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

      const values: CreateMessageValues = {
        body,
        workspaceId,
        channelId,
        parentMessageId: messageId,
        image: undefined,
      };

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

        values.image = storageId;
      }
      await createMessage.mutateAsync(values);
      setEditorKey((prev) => prev + 1);
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setIsPending(false);
      editorRef.current?.enable(true);
    }
  };

  if (getMessage.isLoading || getMessages.status === "LoadingFirstPage") {
    return (
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center h-[49px] px-4 border-b">
          <p className="text-lg font-bold">Thread</p>
          <Button onClick={onClose} size="iconSm" variant="ghost">
            <XIcon className="size-5 stroke-[1.5] " />
          </Button>
        </div>
        <div className="flex h-full items-center justify-center">
          <Loader className="size-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!getMessage.data) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center h-[49px] px-4 border-b">
          <p className="text-lg font-bold">Thread</p>
          <Button onClick={onClose} size="iconSm" variant="ghost">
            <XIcon className="size-5 stroke-[1.5] " />
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
      <div className="flex justify-between items-center h-[49px] px-4 border-b">
        <p className="text-lg font-bold">Thread</p>
        <Button onClick={onClose} size="iconSm" variant="ghost">
          <XIcon className="size-5 stroke-[1.5] " />
        </Button>
      </div>
      <div className="flex-1 flex flex-col-reverse pb-4 overflow-y-auto messages-scrollbar">
        {Object.entries(groupedMessages || {}).map(([dateKey, messages]) => (
          <div key={dateKey}>
            <div className="text-center my-2 relative">
              <hr className="absolute top-1/2 left-0 right-0 border-t border-gray-300" />
              <span className="relative inline-block bg-white px-4 py-1 rounded-full text-xs border border-gray-300 shadow-sm">
                {formatDateLabel(dateKey)}
              </span>
            </div>
            {messages.map((message, index) => {
              const prevMessage = messages[index - 1];
              const isCompact =
                prevMessage &&
                prevMessage.user?._id === message.user?._id &&
                dayjs(message._creationTime).diff(
                  dayjs(prevMessage._creationTime),
                  "minute"
                ) < TIME_THRESHOLD;
              return (
                <Message
                  key={message._id}
                  id={message._id}
                  memberId={message.memberId}
                  authorImage={message.user.image}
                  authorName={message.user.name}
                  reactions={message.reactions}
                  body={message.body}
                  image={message.image}
                  updatedAt={message.updatedAt}
                  createdAt={message._creationTime}
                  threadCount={message.threadCount}
                  threadImage={message.threadImage}
                  threadTimestamp={message.threadTimestamp}
                  threadName={message.threadName}
                  isEditing={editingId === message._id}
                  setEditingId={setEditingId}
                  isCompact={isCompact}
                  hideThreadButton
                  isAuthor={currentMember.data?._id === message.memberId}
                />
              );
            })}
          </div>
        ))}
        <div
          className="h-1"
          ref={(el) => {
            if (el) {
              const observer = new IntersectionObserver(
                ([entry]) => {
                  if (
                    entry.isIntersecting &&
                    getMessages.status === "CanLoadMore"
                  ) {
                    getMessages.loadMore();
                  }
                },
                {
                  threshold: 1.0,
                }
              );
              observer.observe(el);
              return () => observer.disconnect();
            }
          }}
        ></div>
        {getMessages.status === "LoadingMore" && (
          <div className="text-center my-2 relative">
            <hr className="absolute top-1/2 left-0 right-0 border-t border-gray-300" />
            <span className="relative inline-block bg-white px-4 py-1 rounded-full text-xs border border-gray-300 shadow-sm">
              <Loader className="size-4 animate-spin" />
            </span>
          </div>
        )}
        <Message
          id={getMessage.data._id}
          memberId={getMessage.data.memberId}
          authorImage={getMessage.data.user.image}
          authorName={getMessage.data.user.name}
          reactions={getMessage.data.reactions}
          body={getMessage.data.body}
          image={getMessage.data.image}
          updatedAt={getMessage.data.updatedAt}
          createdAt={getMessage.data._creationTime}
          isEditing={editingId === getMessage.data._id}
          setEditingId={setEditingId}
          hideThreadButton
          isAuthor={currentMember.data?._id === getMessage.data.memberId}
        />
      </div>
      <div className="px-4">
        <Editor
          onSubmit={handleSubmit}
          disabled={isPending}
          placeholder="Reply..."
          key={editorKey}
          innerRef={editorRef}
        />
      </div>
    </div>
  );
};
