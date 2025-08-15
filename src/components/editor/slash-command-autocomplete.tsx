import { useCallback, useEffect, useRef, useState } from 'react';
import { Command, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useGifModal } from '@/stores/gif-modal-store';
import { Image } from 'lucide-react';

interface SlashCommand {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface SlashCommandAutoCompleteProps {
  quill: any;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onGifSelect?: (gif: any) => void;
}

const commands: SlashCommand[] = [
  {
    id: 'gif',
    title: 'GIF',
    description: 'Find and share GIFs',
    icon: <Image className="h-4 w-4" aria-label="GIF" />,
  },
];

const SlashCommandAutoComplete = ({
  quill,
  containerRef,
  onGifSelect,
}: SlashCommandAutoCompleteProps) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const [startIndex, setStartIndex] = useState<number>(0);

  const { openGifModal } = useGifModal();

  const isOpenRef = useRef(isOpen);
  const selectedIndexRef = useRef(selectedIndex);
  const startIndexRef = useRef(startIndex);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);
  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);
  useEffect(() => {
    startIndexRef.current = startIndex;
  }, [startIndex]);

  const filteredCommands = commands.filter((cmd) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      cmd.id.includes(q) ||
      cmd.title.toLowerCase().includes(q) ||
      cmd.description.toLowerCase().includes(q)
    );
  });

  const executeCommand = useCallback(
    (command: SlashCommand) => {
      const sel = quill?.getSelection();
      if (!sel) return;

      quill.deleteText(startIndexRef.current, sel.index - startIndexRef.current);

      if (command.id === 'gif') {
        openGifModal(quill, startIndexRef.current, onGifSelect);
      }

      setIsOpen(false);
      setQuery('');
      setSelectedIndex(0);
    },
    [quill, openGifModal, onGifSelect],
  );

  useEffect(() => {
    if (!quill) return;

    const handleTextChange = () => {
      const sel = quill.getSelection();
      if (!sel) {
        setIsOpen(false);
        return;
      }

      const text = quill.getText(0, sel.index);
      const match = text.match(/(?:^|\s)\/([a-zA-Z0-9]*)$/);

      if (match) {
        const [fullMatch, commandQuery] = match;
        const index = sel.index - fullMatch.length;

        setQuery(commandQuery || '');
        setStartIndex(index);
        setIsOpen(true);
        setSelectedIndex(0);

        const bounds = quill.getBounds(sel.index);
        if (bounds && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setPosition({
            left: rect.left + bounds.left + window.scrollX,
            top: rect.top + bounds.top + bounds.height + window.scrollY,
          });
        }
      } else {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpenRef.current) return;

      const filtered = commands.filter((cmd) => {
        const q = query.toLowerCase();
        return (
          !q ||
          cmd.id.includes(q) ||
          cmd.title.toLowerCase().includes(q) ||
          cmd.description.toLowerCase().includes(q)
        );
      });

      if (filtered.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => (i + 1) % filtered.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          const command = filtered[selectedIndexRef.current];
          if (command) {
            executeCommand(command);
          }
          return false; // Explicitly return false to prevent any further handling
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
      }
    };

    quill.on('text-change', handleTextChange);
    quill.root.addEventListener('keydown', handleKeyDown, true); // Use capture phase

    return () => {
      quill.off('text-change', handleTextChange);
      quill.root.removeEventListener('keydown', handleKeyDown, true); // Remove from capture phase
    };
  }, [quill, query, executeCommand]);

  useEffect(() => {
    if (quill) {
      (quill as any).commandDropdownOpen = isOpen;
    }
  }, [isOpen, quill]);

  if (!isOpen || !position || filteredCommands.length === 0) return null;

  return (
    <div
      className="fixed z-[100] w-80 shadow-lg"
      style={{
        left: position.left,
        bottom: `${window.innerHeight - position.top - 20}px`,
      }}
    >
      <Command>
        <CommandList>
          {filteredCommands.map((command, i) => (
            <CommandItem
              key={command.id}
              onSelect={() => executeCommand(command)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 cursor-pointer',
                i === selectedIndex && 'bg-accent',
              )}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                {command.icon}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">{command.title}</div>
                <div className="text-xs text-muted-foreground">{command.description}</div>
              </div>
            </CommandItem>
          ))}
        </CommandList>
      </Command>
    </div>
  );
};

export default SlashCommandAutoComplete;
