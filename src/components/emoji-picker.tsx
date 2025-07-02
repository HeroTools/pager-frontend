import React, { useState, ReactNode } from "react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { useTheme } from "next-themes";
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

const EmojiPicker: React.FC<EmojiPickerProps> = ({
  onSelect,
  trigger,
  open,
  onOpenChange,
}) => {
  const { systemTheme } = useTheme();
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
        <Picker
          data={data}
          onEmojiSelect={(emoji: any) => {
            onSelect(emoji.native);
            setOpen(false);
          }}
          theme={systemTheme === "dark" ? "dark" : "light"}
          set="native"
          previewPosition="none"
          skinTonePosition="none"
          maxFrequentRows={2}
          perLine={8}
        />
      </PopoverContent>
    </Popover>
  );
};

export default EmojiPicker;
