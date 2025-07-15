import type { ReactNode } from 'react';
import React, { useState } from 'react';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import { useTheme } from 'next-themes';
import { Smile } from 'lucide-react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

interface EmojiData {
  id: string;
  name: string;
  native: string;
  unified: string;
  keywords: string[];
  shortcodes: string;
}

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect, trigger, open, onOpenChange }) => {
  const { resolvedTheme } = useTheme();
  const [internalOpen, setInternalOpen] = useState<boolean>(false);

  const isControlled = open !== undefined && onOpenChange !== undefined;
  const popoverOpen = isControlled ? open : internalOpen;

  const setOpen = (val: boolean): void => {
    if (isControlled && onOpenChange) {
      onOpenChange(val);
    } else {
      setInternalOpen(val);
    }
  };

  const handleEmojiSelect = (emoji: EmojiData): void => {
    onSelect(emoji.native);
    setOpen(false);
  };

  const defaultTrigger = (
    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-sidebar-hover">
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
          autoFocus={true}
          onEmojiSelect={handleEmojiSelect}
          theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
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
