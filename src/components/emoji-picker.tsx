import React, { useState, ReactNode } from "react";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Smile } from "lucide-react";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const EmojiPickerComponent: React.FC<EmojiPickerProps> = ({
  onSelect,
  trigger,
  open,
  onOpenChange,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled =
    typeof open === "boolean" && typeof onOpenChange === "function";
  const popoverOpen = isControlled ? open! : internalOpen;
  const setOpen = (val: boolean) => {
    if (isControlled) {
      onOpenChange!(val);
    } else {
      setInternalOpen(val);
    }
  };

  const defaultTrigger = (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0 hover:bg-sidebar-hover"
    >
      <Smile className="w-4 h-4" />
    </Button>
  );

  return (
    <Popover open={popoverOpen} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger ?? defaultTrigger}</PopoverTrigger>
      <PopoverContent
        className="p-0 w-auto border-0 shadow-lg"
        align="end"
        side="top"
        sideOffset={8}
      >
        <EmojiPicker
          onEmojiClick={(emojiData: EmojiClickData) => {
            onSelect(emojiData.emoji);
            setOpen(false);
          }}
          autoFocusSearch={false}
          lazyLoadEmojis={true}
          previewConfig={{
            showPreview: false,
          }}
          searchDisabled={false}
          skinTonesDisabled={true}
          width={320}
          height={400}
        />
      </PopoverContent>
    </Popover>
  );
};

export default EmojiPickerComponent;
