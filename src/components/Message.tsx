import dayjs, { Dayjs } from "dayjs";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Delta } from "quill";

import { useCreateMessage, useUpdateMessage, useDeleteMessage } from "@/features/messages/api/useMessages";
import { useToggleReaction } from "@/features/reactions/api/useReactions";
import { useConfirm } from "@/hooks/useConfirm";
import { usePanel } from "@/hooks/usePanel";
import { cn } from "@/lib/utils";
import { Hint } from "./Hint";
import { Reactions } from "./Reactions";
import { ThreadBar } from "./ThreadBar";
import { Thumbnail } from "./Thumbnail";
import { Toolbar } from "./Toolbar";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

const Renderer = dynamic(() => import("@/components/Renderer"), { ssr: false });
const Editor = dynamic(() => import("@/components/Editor"), { ssr: false });

interface MessageProps {
  id: string;
  channelId: string;
  memberId: string;
  authorImage?: string;
  authorName?: string;
  isAuthor: boolean;
  reactions: Array<{
    id: string;
    emoji: string;
    count: number;
    memberIds: string[];
  }>;
  body: string;
  image?: string | null;
  createdAt: number;
  updatedAt: number;
  isEditing: boolean;
  isCompact?: boolean;
  hideThreadButton?: boolean;
  threadCount?: number;
  threadImage?: string;
  threadTimestamp?: number;
  threadName?: string;
  setEditingId: (id: string | null) => void;
}

const formatFullTime = (date: Dayjs) => {
  if (date.isToday()) return "Today";
  else if (date.isYesterday()) return "Yesterday";
  return date.format("MMM D, YYYY") + " at " + date.format("h:mm:ss a");
};

export const Message = ({
  body,
  channelId,
  createdAt,
  id,
  isEditing,
  memberId,
  reactions,
  updatedAt,
  authorImage,
  authorName = "Member",
  hideThreadButton,
  image,
  isCompact,
  threadCount,
  threadImage,
  threadTimestamp,
  threadName,
  isAuthor,
  setEditingId,
}: MessageProps) => {
  const {
    parentMessageId,
    openMessage,
    openProfile,
    close: closeMessage,
  } = usePanel();
  const [ConfirmDialog, confirm] = useConfirm(
    "Delete message?",
    "Are you sure you want to delete this message? This cannot be undone"
  );
  const updateMessage = useUpdateMessage();
  const deleteMessage = useDeleteMessage();
  const toggleReaction = useToggleReaction(id);

  const isPending =
    updateMessage.isPending ||
    deleteMessage.isPending ||
    toggleReaction.isPending;

  const handleUpdate = ({ body }: { body: string }) => {
    updateMessage
      .mutateAsync({
        channelId,
        messageId: id,
        content: body,
      })
      .then(() => {
        toast.success("Message updated");
        setEditingId(null);
      })
      .catch((error: Error) => {
        console.error(error);
        toast.error("Failed to update message");
      });
  };

  const handleRemove = async () => {
    const ok = await confirm();
    if (!ok) return;

    deleteMessage
      .mutateAsync({
        channelId,
        messageId: id,
      })
      .then(() => {
        toast.success("Message deleted");
        setEditingId(null);

        if (id === parentMessageId) {
          closeMessage();
        }
      })
      .catch((error: Error) => {
        console.error(error);
        toast.error("Failed to delete message");
      });
  };

  const handleReaction = (emoji: string) => {
    toggleReaction
      .mutateAsync({
        emoji,
      })
      .catch((error: Error) => {
        console.error(error);
        toast.error("Failed to toggle reaction");
      });
  };

  if (isCompact) {
    return (
      <>
        <ConfirmDialog />
        <div
          className={cn(
            "flex flex-col gap-2 p-1.5 px-5 hover:bg-gray-100/60 group relative",
            isEditing && "bg-[#F2C74433] hover:bg-[#F2C74433]",
            deleteMessage.isPending &&
              "bg-rose-500/50 transform transition-all scale-y-0 origin-bottom duration-200"
          )}
        >
          <div className="flex items-start gap-2">
            <Hint label={formatFullTime(dayjs(createdAt))}>
              <button className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 w-[40px] leading-[22px] text-center hover:underline">
                {dayjs(createdAt).format("hh:mm")}
              </button>
            </Hint>
            {isEditing ? (
              <div className="w-full h-full">
                <Editor
                  onSubmit={handleUpdate}
                  defaultValue={JSON.parse(body)}
                  disabled={isPending}
                  onCancel={() => setEditingId(null)}
                  variant="update"
                />
              </div>
            ) : (
              <div className="flex flex-col w-full">
                <Renderer value={body} />
                <Thumbnail url={image} />
                {updatedAt ? (
                  <span className="text-xs text-muted-foreground">
                    (edited)
                  </span>
                ) : null}
                <Reactions messageId={id} data={reactions} />
                <ThreadBar
                  count={threadCount}
                  image={threadImage}
                  name={threadName}
                  timestamp={threadTimestamp}
                  onClick={() => openMessage(id)}
                />
              </div>
            )}
          </div>
          {!isEditing && (
            <Toolbar
              isAuthor={isAuthor}
              isPending={isPending}
              hideThreadButton={hideThreadButton}
              onEdit={() => setEditingId(id)}
              onThread={() => openMessage(id)}
              onDelete={handleRemove}
              onReaction={handleReaction}
            />
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="group relative flex items-start gap-x-2 p-4 hover:bg-slate-100/50">
        <Avatar className="h-8 w-8">
          <AvatarImage src={authorImage} />
          <AvatarFallback>{authorName[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-x-2">
            <p className="text-sm font-semibold">{authorName}</p>
            <p className="text-xs text-muted-foreground">
              {dayjs(createdAt).format("MMM D, YYYY h:mm A")}
            </p>
          </div>
          {image && (
            <div className="relative aspect-video w-full overflow-hidden rounded-lg">
              <Thumbnail url={image} />
            </div>
          )}
          {isEditing ? (
            <Editor
              onSubmit={handleUpdate}
              defaultValue={JSON.parse(body)}
              disabled={isPending}
              onCancel={() => setEditingId(null)}
              variant="update"
            />
          ) : (
            <Renderer value={body} />
          )}
          <Reactions messageId={id} data={reactions} />
          {!hideThreadButton && (
            <ThreadBar
              onClick={() => openMessage(id)}
              count={threadCount}
              image={threadImage}
              timestamp={threadTimestamp}
              name={threadName}
            />
          )}
        </div>
        <Toolbar
          isAuthor={isAuthor}
          isPending={isPending}
          hideThreadButton={hideThreadButton}
          onEdit={() => setEditingId(id)}
          onThread={() => openMessage(id)}
          onDelete={handleRemove}
          onReaction={handleReaction}
        />
      </div>
      <ConfirmDialog />
    </>
  );
};
