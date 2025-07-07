import { useEffect, useRef, useState } from 'react';
import { Command, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import emojiMartData from '@emoji-mart/data/sets/15/native.json';

type EmojiMartEmoji = {
  id: string;
  name: string;
  keywords?: string[];
  skins: { native: string }[];
};

interface EmojiAutoCompleteProps {
  quill: any; // Quill instance
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const EmojiAutoComplete = ({ quill, containerRef }: EmojiAutoCompleteProps) => {
  const [emojiQuery, setEmojiQuery] = useState('');
  const [showEmojiDropdown, setShowEmojiDropdown] = useState(false);
  const [emojiDropdownIndex, setEmojiDropdownIndex] = useState(0);
  const [dropdownPos, setDropdownPos] = useState<{ left: number; top: number } | null>(null);

  // Add refs for latest values to avoid stale closure issues
  const emojiQueryRef = useRef(emojiQuery);
  const showEmojiDropdownRef = useRef(showEmojiDropdown);
  const emojiDropdownIndexRef = useRef(emojiDropdownIndex);

  // Keep refs in sync with state
  useEffect(() => {
    emojiQueryRef.current = emojiQuery;
  }, [emojiQuery]);
  useEffect(() => {
    showEmojiDropdownRef.current = showEmojiDropdown;
  }, [showEmojiDropdown]);
  useEffect(() => {
    emojiDropdownIndexRef.current = emojiDropdownIndex;
  }, [emojiDropdownIndex]);

  const emojiData = emojiMartData as { emojis: Record<string, any> };

  // Helper: get Quill root offset relative to the page
  const getQuillRootOffset = () => {
    if (!containerRef.current) {
      return { left: 0, top: 0 };
    }
    const rect = containerRef.current.getBoundingClientRect();
    return { left: rect.left + window.scrollX, top: rect.top + window.scrollY };
  };

  // Helper: filter emojis
  const getFilteredEmojis = (query: string): EmojiMartEmoji[] => {
    if (!query) {
      return [];
    }
    const q = query.toLowerCase();
    return Object.values(emojiData.emojis)
      .filter(
        (e) =>
          e.id.includes(q) ||
          (e.name && e.name.toLowerCase().includes(q)) ||
          (e.keywords && e.keywords.some((k: string) => k.includes(q))),
      )
      .slice(0, 8);
  };

  // Set up event listeners when quill instance changes
  useEffect(() => {
    if (!quill) {
      return;
    }

    const handleTextChange = () => {
      const sel = quill.getSelection();
      if (!sel) {
        setShowEmojiDropdown(false);
        return;
      }
      const textBefore = quill.getText(0, sel.index);
      const match = textBefore.match(/:([a-zA-Z0-9_+-]{2,})(?:\n)?$/);
      if (match) {
        const newQuery = match[1];
        const queryChanged = newQuery !== emojiQueryRef.current;
        setEmojiQuery(newQuery);
        setShowEmojiDropdown(true);
        // Only reset index if the query actually changed
        if (queryChanged) {
          setEmojiDropdownIndex(0);
          emojiDropdownIndexRef.current = 0;
        }
        if (quill && sel && typeof sel.index === 'number') {
          const bounds = quill.getBounds(sel.index);
          const quillOffset = getQuillRootOffset();
          if (bounds && typeof bounds.left === 'number' && typeof bounds.top === 'number') {
            setDropdownPos({
              left: quillOffset.left + bounds.left,
              top: quillOffset.top + bounds.top,
            });
          }
        }
      } else {
        setShowEmojiDropdown(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showEmojiDropdownRef.current) {
        return;
      }
      const filtered = getFilteredEmojis(emojiQueryRef.current);
      if (filtered.length === 0) {
        return;
      }

      if (e.key === 'ArrowDown') {
        const oldIndex = emojiDropdownIndexRef.current;
        const newIndex = (oldIndex + 1) % filtered.length;
        setEmojiDropdownIndex(newIndex);
        emojiDropdownIndexRef.current = newIndex; // Update ref immediately
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        const oldIndex = emojiDropdownIndexRef.current;
        const newIndex = (oldIndex - 1 + filtered.length) % filtered.length;
        setEmojiDropdownIndex(newIndex);
        emojiDropdownIndexRef.current = newIndex; // Update ref immediately
        e.preventDefault();
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        // Insert selected emoji
        const emoji = filtered[emojiDropdownIndexRef.current];
        if (emoji) {
          const sel = quill.getSelection();
          if (sel) {
            const textBefore = quill.getText(0, sel.index);
            const match = textBefore.match(/:([a-zA-Z0-9_+-]{2,})(?:\n)?$/);
            if (match) {
              quill.deleteText(sel.index - match[0].length, match[0].length);
              quill.insertText(sel.index - match[0].length, emoji.skins[0]?.native);
              setShowEmojiDropdown(false);
              setEmojiQuery('');
              setEmojiDropdownIndex(0);
              setDropdownPos(null);
              e.preventDefault();
              e.stopPropagation();
            } else {
              setShowEmojiDropdown(false);
              setEmojiQuery('');
              setEmojiDropdownIndex(0);
              setDropdownPos(null);
              e.preventDefault();
              e.stopPropagation();
            }
          }
        }
      } else if (e.key === 'Escape') {
        setShowEmojiDropdown(false);
        setEmojiQuery('');
        setEmojiDropdownIndex(0);
        setDropdownPos(null);
        e.preventDefault();
      }
    };

    // Add event listeners
    quill.on('text-change', handleTextChange);
    quill.root.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      quill.off('text-change', handleTextChange);
      quill.root.removeEventListener('keydown', handleKeyDown);
    };
  }, [quill]);

  // Expose showEmojiDropdown state to parent for keyboard binding check
  useEffect(() => {
    if (quill) {
      (quill as any).emojiDropdownOpen = showEmojiDropdown;
    }
  }, [showEmojiDropdown, quill]);

  const handleEmojiClick = (emoji: EmojiMartEmoji) => {
    if (!quill) {
      return;
    }
    const sel = quill.getSelection();
    if (sel) {
      const textBefore = quill.getText(0, sel.index);
      const match = textBefore.match(/:([a-zA-Z0-9_+-]{2,})(?:\n)?$/);
      if (match) {
        quill.deleteText(sel.index - match[0].length, match[0].length);
        quill.insertText(sel.index - match[0].length, emoji.skins[0]?.native);
        setShowEmojiDropdown(false);
        setEmojiQuery('');
        setEmojiDropdownIndex(0);
        setDropdownPos(null);
      }
    }
  };

  if (!showEmojiDropdown || !dropdownPos) {
    return null;
  }

  const filteredEmojis = getFilteredEmojis(emojiQuery);

  return (
    <div
      style={{
        position: 'fixed',
        left: dropdownPos.left,
        bottom: `${window.innerHeight - dropdownPos.top - 20}px`,
        zIndex: 100,
        width: 320,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      <Command>
        <CommandList>
          {filteredEmojis.map((emoji, i) => (
            <CommandItem
              key={emoji.id}
              onSelect={() => handleEmojiClick(emoji)}
              className={cn(i === emojiDropdownIndex && 'bg-accent text-accent-foreground')}
            >
              <span className="mr-2 text-lg">{emoji.skins[0]?.native}</span> :{emoji.id}:
            </CommandItem>
          ))}
        </CommandList>
      </Command>
    </div>
  );
};

export default EmojiAutoComplete;
