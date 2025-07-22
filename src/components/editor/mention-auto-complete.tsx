import { useEffect, useRef, useState } from 'react';
import { Command, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useGetMembers } from '@/features/members/hooks/use-members';
import { useWorkspaceId } from '@/hooks/use-workspace-id';
import { useGetWorkspace } from '@/features/workspaces/hooks/use-workspaces';
import { MemberWithUser } from '@/features/members/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface MentionAutoCompleteProps {
  quill: any; // Quill instance
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const MentionAutoComplete = ({ quill, containerRef }: MentionAutoCompleteProps) => {
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionDropdownIndex, setMentionDropdownIndex] = useState(0);
  const [dropdownPos, setDropdownPos] = useState<{ left: number; top: number } | null>(null);

  // Add refs for latest values to avoid stale closure issues
  const mentionQueryRef = useRef(mentionQuery);
  const showMentionDropdownRef = useRef(showMentionDropdown);
  const mentionDropdownIndexRef = useRef(mentionDropdownIndex);

  // Keep refs in sync with state
  useEffect(() => {
    mentionQueryRef.current = mentionQuery;
  }, [mentionQuery]);
  useEffect(() => {
    showMentionDropdownRef.current = showMentionDropdown;
  }, [showMentionDropdown]);
  useEffect(() => {
    mentionDropdownIndexRef.current = mentionDropdownIndex;
  }, [mentionDropdownIndex]);

  const workspaceId = useWorkspaceId();
  const { data: workspace } = useGetWorkspace(workspaceId || '');
  const { data: members = [] } = useGetMembers(workspaceId || '');

  // Helper: get Quill root offset relative to the page
  const getQuillRootOffset = () => {
    if (!containerRef.current) {
      return { left: 0, top: 0 };
    }
    const rect = containerRef.current.getBoundingClientRect();
    return { left: rect.left + window.scrollX, top: rect.top + window.scrollY };
  };

  // Helper: filter members (only show active/non-deactivated members)
  const getFilteredMembers = (query: string): MemberWithUser[] => {
    // Filter out deactivated members first
    const activeMembers = members.filter((member) => !member.is_deactivated);
    
    if (!query) {
      return activeMembers.slice(0, 8);
    }
    const q = query.toLowerCase();

    const getScore = (member: MemberWithUser) => {
      const name = member.user.name.toLowerCase();
      const email = member.user.email.toLowerCase();

      if (name === q) return 10;
      if (name.startsWith(q)) return 9;
      if (email.startsWith(q)) return 8;
      if (name.includes(q)) return 7;
      if (email.includes(q)) return 6;
      return 0;
    };

    return activeMembers
      .map((member) => ({ member, score: getScore(member) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => {
        if (a.score !== b.score) {
          return b.score - a.score;
        }
        return a.member.user.name.localeCompare(b.member.user.name);
      })
      .map((item) => item.member)
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
        setShowMentionDropdown(false);
        return;
      }
      const textBefore = quill.getText(0, sel.index);
      const match = textBefore.match(/@([a-zA-Z0-9._-]*)(?:\n)?$/);
      if (match) {
        const newQuery = match[1];
        const queryChanged = newQuery !== mentionQueryRef.current;
        setMentionQuery(newQuery);
        setShowMentionDropdown(true);
        // Only reset index if the query actually changed
        if (queryChanged) {
          setMentionDropdownIndex(0);
          mentionDropdownIndexRef.current = 0;
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
        setShowMentionDropdown(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showMentionDropdownRef.current) {
        return;
      }
      const filtered = getFilteredMembers(mentionQueryRef.current);
      if (filtered.length === 0) {
        return;
      }

      if (e.key === 'ArrowDown') {
        const oldIndex = mentionDropdownIndexRef.current;
        const newIndex = (oldIndex + 1) % filtered.length;
        setMentionDropdownIndex(newIndex);
        mentionDropdownIndexRef.current = newIndex;
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        const oldIndex = mentionDropdownIndexRef.current;
        const newIndex = (oldIndex - 1 + filtered.length) % filtered.length;
        setMentionDropdownIndex(newIndex);
        mentionDropdownIndexRef.current = newIndex;
        e.preventDefault();
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        // Insert selected mention
        const member = filtered[mentionDropdownIndexRef.current];
        if (member) {
          const sel = quill.getSelection();
          if (sel) {
            const textBefore = quill.getText(0, sel.index);
            const match = textBefore.match(/@([a-zA-Z0-9._-]*)(?:\n)?$/);
            if (match) {
              quill.deleteText(sel.index - match[0].length, match[0].length);
              // Insert mention as a custom blot with member data
              quill.insertEmbed(sel.index - match[0].length, 'mention', {
                id: member.id,
                name: member.user.name,
                userId: member.user_id
              });
              quill.insertText(sel.index - match[0].length + 1, ' ');
              setShowMentionDropdown(false);
              setMentionQuery('');
              setMentionDropdownIndex(0);
              setDropdownPos(null);
              e.preventDefault();
              e.stopPropagation();
            } else {
              setShowMentionDropdown(false);
              setMentionQuery('');
              setMentionDropdownIndex(0);
              setDropdownPos(null);
              e.preventDefault();
              e.stopPropagation();
            }
          }
        }
      } else if (e.key === 'Escape') {
        setShowMentionDropdown(false);
        setMentionQuery('');
        setMentionDropdownIndex(0);
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
  }, [quill, members]);

  // Expose showMentionDropdown state to parent for keyboard binding check
  useEffect(() => {
    if (quill) {
      (quill as any).mentionDropdownOpen = showMentionDropdown;
    }
  }, [showMentionDropdown, quill]);

  const handleMentionClick = (member: MemberWithUser) => {
    if (!quill) {
      return;
    }
    const sel = quill.getSelection();
    if (sel) {
      const textBefore = quill.getText(0, sel.index);
      const match = textBefore.match(/@([a-zA-Z0-9._-]*)(?:\n)?$/);
      if (match) {
        quill.deleteText(sel.index - match[0].length, match[0].length);
        // Insert mention as a custom blot with member data
        quill.insertEmbed(sel.index - match[0].length, 'mention', {
          id: member.id,
          name: member.user.name,
          userId: member.user_id
        });
        quill.insertText(sel.index - match[0].length + 1, ' ');
        setShowMentionDropdown(false);
        setMentionQuery('');
        setMentionDropdownIndex(0);
        setDropdownPos(null);
      }
    }
  };

  if (!showMentionDropdown || !dropdownPos) {
    return null;
  }

  const filteredMembers = getFilteredMembers(mentionQuery);

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
          {filteredMembers.map((member, i) => (
            <CommandItem
              key={member.id}
              onSelect={() => handleMentionClick(member)}
              className={cn(
                i === mentionDropdownIndex && 'bg-accent text-accent-foreground',
                'flex items-center gap-2 px-3 py-2'
              )}
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={member.user.image} alt={member.user.name} />
                <AvatarFallback className="text-xs">
                  {member.user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium text-sm">{member.user.name}</span>
                <span className="text-xs text-muted-foreground">{member.user.email}</span>
              </div>
            </CommandItem>
          ))}
        </CommandList>
      </Command>
    </div>
  );
};

export default MentionAutoComplete;