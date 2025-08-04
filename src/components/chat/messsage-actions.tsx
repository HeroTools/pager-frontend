import EmojiPicker from '@emoji-mart/react';
import { Edit, MessageSquare, MoreHorizontal, Smile, Trash2 } from 'lucide-react';
import type { FC } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Message } from '@/types/chat';

export const MessageActions: FC<{
  message: Message;
  isOwnMessage: boolean;
  hideThreadButton: boolean;
  isEmojiPickerOpen: boolean;
  isDropdownOpen: boolean;
  isInThread: boolean;
  onEmojiPickerToggle: (open: boolean) => void;
  onEmojiSelect: (emoji: string) => void;
  onThreadOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  setIsDropdownOpen: (open: boolean) => void;
}> = ({
  message,
  isOwnMessage,
  hideThreadButton,
  isEmojiPickerOpen,
  isDropdownOpen,
  onEmojiPickerToggle,
  onEmojiSelect,
  onThreadOpen,
  onEdit,
  onDelete,
  setIsDropdownOpen,
}) => (
  <div className="flex items-center">
    <EmojiPicker
      open={isEmojiPickerOpen}
      onOpenChange={onEmojiPickerToggle}
      onSelect={onEmojiSelect}
      trigger={
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-sidebar-hover">
          <Smile className="w-4 h-4" />
        </Button>
      }
    />

    {!hideThreadButton && (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 hover:bg-sidebar-hover"
        onClick={onThreadOpen}
      >
        <MessageSquare className="w-4 h-4" />
      </Button>
    )}

    {isOwnMessage && (
      <DropdownMenu onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-sidebar-hover">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="w-4 h-4 mr-2" />
            Edit message
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onDelete}
            className="text-text-destructive hover:text-text-destructive/80"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete message
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )}
  </div>
);
