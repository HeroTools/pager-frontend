import dayjs, { Dayjs } from "dayjs";
import dynamic from "next/dynamic";
import { toast } from "sonner";

import { useRemoveMessage } from "@/features/messages/api/useRemoveMessage";
import { useUpdateMessage } from "@/features/messages/api/useUpdateMessage";
import { useToggleReaction } from "@/features/reactions/api/useToggleReaction";
import { useConfirm } from "@/hooks/useConfirm";
import { usePanel } from "@/hooks/usePanel";
import { cn } from "@/lib/utils";
import { Doc, Id } from "../../convex/_generated/dataModel";
import { Hint } from "./Hint";
import { Reactions } from "./Reactions";
import { ThreadBar } from "./ThreadBar";
import { Thumbnail } from "./Thumbnail";
import { Toolbar } from "./Toolbar";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

const Renderer = dynamic(() => import("@/components/Renderer"), { ssr: false });
const Editor = dynamic(() => import("@/components/Editor"), { ssr: false });

interface MessageProps {
  id: Id<"messages">;
  memberId: Id<"members">;
  authorImage?: string;
  authorName?: string;
  isAuthor: boolean;
  reactions: Array<
    Omit<Doc<"reactions">, "memberId"> & {
      count: number;
      memberIds: Id<"members">[];
    }
  >;
  body: Doc<"messages">["body"];
  image?: string | null;
  createdAt: Doc<"messages">["_creationTime"];
  updatedAt: Doc<"messages">["updatedAt"];
  isEditing: boolean;
  isCompact?: boolean;
  hideThreadButton?: boolean;
  threadCount?: number;
  threadImage?: string;
  threadTimestamp?: number;
  threadName?: string;
  setEditingId: (id: Id<"messages"> | null) => void;
}

const formatFullTime = (date: Dayjs) => {
  if (date.isToday()) return "Today";
  else if (date.isYesterday()) return "Yesterday";
  return date.format("MMM D, YYYY") + " at " + date.format("h:mm:ss a");
};

export const Message = ({
  body,
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
  const removeMessage = useRemoveMessage();
  const toggleReaction = useToggleReaction();

  const isPending =
    updateMessage.isPending ||
    removeMessage.isPending ||
    toggleReaction.isPending;

  const handleUpdate = ({ body }: { body: string }) => {
    updateMessage
      .mutateAsync({
        id,
        body,
      })
      .then(() => {
        toast.success("Message updated");
        setEditingId(null);
      })
      .catch((error) => {
        console.error(error);
        toast.error("Failed to update message");
      });
  };

  const handleRemove = async () => {
    const ok = await confirm();
    if (!ok) return;

    removeMessage
      .mutateAsync({
        id,
      })
      .then(() => {
        toast.success("Message deleted");
        setEditingId(null);

        if (id === parentMessageId) {
          closeMessage();
        }
      })
      .catch((error) => {
        console.error(error);
        toast.error("Failed to delete message");
      });
  };

  const handleReaction = (value: string) => {
    toggleReaction
      .mutateAsync({
        messageId: id,
        value,
      })
      .catch((error) => {
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
            removeMessage.isPending &&
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
                  disabled={isPending}
                  defaultValue={JSON.parse(body)}
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
                <Reactions data={reactions} onChange={handleReaction} />
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
      <ConfirmDialog />
      <div
        className={cn(
          "flex flex-col gap-2 p-1.5 px-5 hover:bg-gray-100/60 group relative",
          isEditing && "bg-[#F2C74433] hover:bg-[#F2C74433]",
          removeMessage.isPending &&
            "bg-rose-500/50 transform transition-all scale-y-0 origin-bottom duration-200"
        )}
      >
        <div className="flex items-start gap-2">
          <button onClick={() => openProfile(memberId)}>
            <Avatar>
              <AvatarImage src={authorImage} />
              <AvatarFallback>
                {authorName?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>
          {isEditing ? (
            <div className="w-full h-full">
              <Editor
                onSubmit={handleUpdate}
                disabled={isPending}
                defaultValue={JSON.parse(body)}
                onCancel={() => setEditingId(null)}
                variant="update"
              />
            </div>
          ) : (
            <div className="flex flex-col w-full overflow-hidden">
              <div className="text-sm">
                <button
                  className="font-bold text-primary hover:underline"
                  onClick={() => openProfile(memberId)}
                >
                  {authorName}
                </button>
                <span>&nbsp;&nbsp;</span>
                <Hint label={formatFullTime(dayjs(createdAt))}>
                  <button className="text-xs text-muted-foreground hover:underline">
                    {dayjs(createdAt).format("h:mm a")}
                  </button>
                </Hint>
              </div>
              <Renderer value={body} />
              <Thumbnail url={image} />
              {updatedAt ? (
                <span className="text-xs text-muted-foreground">(edited)</span>
              ) : null}
              <Reactions data={reactions} onChange={handleReaction} />
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
};
