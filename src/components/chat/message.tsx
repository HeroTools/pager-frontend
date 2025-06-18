import { FC, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  MoreHorizontal,
  MessageSquare,
  Smile,
  Edit,
  Trash2,
} from "lucide-react";
import { Message, User } from "@/types/chat";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageReactions } from "./message-reactions";
import { MessageContent } from "./message-content";

interface ChatMessageProps {
  message: Message;
  currentUser: User;
  isCompact?: boolean;
  showAvatar?: boolean;
  onEdit?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onReply?: (messageId: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
}

export const ChatMessage: FC<ChatMessageProps> = ({
  message,
  currentUser,
  isCompact = false,
  showAvatar = true,
  onEdit,
  onDelete,
  onReply,
  onReaction,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isOwnMessage = message.authorId === currentUser.id;

  return (
    <div
      className={cn(
        "group relative px-4 hover:bg-message-hover transition-colors",
        isCompact ? "py-0.5" : "py-2"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex gap-3">
        {showAvatar && !isCompact ? (
          <Avatar className="w-9 h-9 flex-shrink-0">
            <AvatarImage src={message.author.avatar} />
            <AvatarFallback className="text-sm">
              {message.author.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-9 flex-shrink-0 flex justify-center items-start pt-0.5">
            {isCompact && (
              <span className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors opacity-0 group-hover:opacity-100">
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        )}

        <div className="flex-1 min-w-0">
          {!isCompact && (
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="font-semibold text-foreground hover:underline cursor-pointer leading-tight">
                {message.author.name}
              </span>
              <span className="text-xs text-muted-foreground leading-tight">
                {formatDistanceToNow(new Date(message.timestamp), {
                  addSuffix: true,
                })}
              </span>
              {message.isEdited && (
                <span className="text-xs text-text-subtle leading-tight">
                  (edited)
                </span>
              )}
            </div>
          )}

          <div className={cn("leading-relaxed", !isCompact && "mt-0")}>
            <MessageContent content={message.content} />
          </div>

          {message.image && (
            <div className="mt-2 max-w-sm">
              <img
                src={message.image}
                alt="Uploaded image"
                className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
              />
            </div>
          )}

          {message.reactions && message.reactions.length > 0 && (
            <MessageReactions
              reactions={message.reactions}
              onReaction={(emoji) => onReaction?.(message.id, emoji)}
              currentUserId={currentUser.id}
            />
          )}

          {message.threadCount && Number(message.threadCount) > 0 && (
            <button
              onClick={() => onReply?.(message.id)}
              className="mt-2 flex items-center gap-1 text-xs text-text-accent hover:text-text-accent/80 hover:underline transition-colors"
            >
              <MessageSquare className="w-3 h-3" />
              {message.threadCount}{" "}
              {message.threadCount === 1 ? "reply" : "replies"}
            </button>
          )}
        </div>
      </div>

      {/* Message Actions */}
      {isHovered && (
        <div className="absolute top-0 right-4 bg-card border border-border-subtle rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-sidebar-hover"
              onClick={() => onReaction?.(message.id, "👍")}
            >
              <Smile className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-sidebar-hover"
              onClick={() => onReply?.(message.id)}
            >
              <MessageSquare className="w-4 h-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-sidebar-hover"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isOwnMessage && (
                  <>
                    <DropdownMenuItem onClick={() => onEdit?.(message.id)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit message
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete?.(message.id)}
                      className="text-text-destructive hover:text-text-destructive/80"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete message
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}
    </div>
  );
};
