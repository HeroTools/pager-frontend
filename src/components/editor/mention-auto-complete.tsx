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
  const getFilteredMembers = (query: string) => {
    if (!members || members.length === 0) {
      return [];
    }
    const filteredMembers = members.filter((member: MemberWithUser) => {
      const isActive = !member.is_deactivated;
      const matchesQuery = member.user.name.toLowerCase().includes(query.toLowerCase());
      return isActive && matchesQuery;
    });
    return filteredMembers.slice(0, 10); // Limit to 10 results
  };

  // Helper: get caret position for dropdown positioning
  const getCaretPosition = () => {
    const selection = quill.getSelection();
    if (!selection) {
      return null;
    }
    
    const bounds = quill.getBounds(selection.index);
    const quillOffset = getQuillRootOffset();
    
    return {
      left: quillOffset.left + bounds.left,
      top: quillOffset.top + bounds.top + bounds.height,
    };
  };

  useEffect(() => {
    if (!quill) {
      return;
    }

    // Handle text changes for @ detection
    const handleTextChange = () => {
      const sel = quill.getSelection();
      if (!sel) {
        setShowMentionDropdown(false);
        setMentionQuery('');
        setDropdownPos(null);
        return;
      }

      const textBefore = quill.getText(0, sel.index);
      const match = textBefore.match(/@([a-zA-Z0-9._-]*)$/);

      if (match) {
        const query = match[1] || '';
        setMentionQuery(query);
        setShowMentionDropdown(true);
        setMentionDropdownIndex(0);
        
        const pos = getCaretPosition();
        if (pos) {
          setDropdownPos(pos);
        }
      } else {
        setShowMentionDropdown(false);
        setMentionQuery('');
        setDropdownPos(null);
      }
    };

    // Handle keyboard events for dropdown navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showMentionDropdownRef.current) {
        return;
      }

      const filteredMembers = getFilteredMembers(mentionQueryRef.current);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionDropdownIndex((prev) => Math.min(prev + 1, filteredMembers.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionDropdownIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        if (filteredMembers.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          const member = filteredMembers[mentionDropdownIndexRef.current];
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
                  userId: member.user.id
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
          userId: member.user.id
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
              className={cn(
                'flex items-center gap-2 px-3 py-2 cursor-pointer',
                i === mentionDropdownIndex && 'bg-accent'
              )}
              onSelect={() => handleMentionClick(member)}
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={member.user.image || ''} />
                <AvatarFallback className="text-xs">
                  {member.user.name?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{member.user.name}</span>
            </CommandItem>
          ))}
          {filteredMembers.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">No members found</div>
          )}
        </CommandList>
      </Command>
    </div>
  );
};

export default MentionAutoComplete;