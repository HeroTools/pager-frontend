import { useEffect, useRef, useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useGetMembers } from '@/features/members/hooks/use-members';
import { MemberWithUser } from '@/features/members/types';
import { useWorkspaceId } from '@/hooks/use-workspace-id';
import { cn } from '@/lib/utils';

interface MentionAutoCompleteProps {
  quill: any;
  containerRef: React.RefObject<HTMLDivElement | null>;
  currentUserId: string;
}

const MentionAutoComplete = ({ quill, containerRef, currentUserId }: MentionAutoCompleteProps) => {
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionDropdownIndex, setMentionDropdownIndex] = useState(0);
  const [isKeyboardNavigation, setIsKeyboardNavigation] = useState(true);
  const [dropdownPos, setDropdownPos] = useState<{ left: number; top: number } | null>(null);

  const mentionQueryRef = useRef(mentionQuery);
  const showMentionDropdownRef = useRef(showMentionDropdown);
  const mentionDropdownIndexRef = useRef(mentionDropdownIndex);
  const isKeyboardNavigationRef = useRef(isKeyboardNavigation);

  useEffect(() => {
    mentionQueryRef.current = mentionQuery;
  }, [mentionQuery]);
  useEffect(() => {
    showMentionDropdownRef.current = showMentionDropdown;
  }, [showMentionDropdown]);
  useEffect(() => {
    mentionDropdownIndexRef.current = mentionDropdownIndex;
  }, [mentionDropdownIndex]);
  useEffect(() => {
    isKeyboardNavigationRef.current = isKeyboardNavigation;
  }, [isKeyboardNavigation]);

  const workspaceId = useWorkspaceId();
  const { data: members = [] } = useGetMembers(workspaceId || '');

  const getQuillRootOffset = () => {
    if (!containerRef.current) {
      return { left: 0, top: 0 };
    }
    const rect = containerRef.current.getBoundingClientRect();
    return { left: rect.left + window.scrollX, top: rect.top + window.scrollY };
  };

  const getFilteredMembers = (query: string) => {
    if (!members || members.length === 0) {
      return [];
    }

    const filteredMembers = members.filter((member: MemberWithUser) => {
      const isActive = !member.is_deactivated;
      const matchesQuery = member.user.name.toLowerCase().includes(query.toLowerCase());
      return isActive && matchesQuery;
    });

    return filteredMembers.slice(0, 10);
  };

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
        setIsKeyboardNavigation(true);

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

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showMentionDropdownRef.current) {
        return;
      }

      const filteredMembers = getFilteredMembers(mentionQueryRef.current);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIsKeyboardNavigation(true);
        setMentionDropdownIndex((prev) => Math.min(prev + 1, filteredMembers.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setIsKeyboardNavigation(true);
        setMentionDropdownIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        if (filteredMembers.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          const member = filteredMembers[mentionDropdownIndexRef.current];
          if (member) {
            const sel = quill.getSelection();
            if (sel) {
              const textBefore = quill.getText(0, sel.index);
              const match = textBefore.match(/@([a-zA-Z0-9._-]*)(?:\n)?$/);
              if (match) {
                const insertPosition = sel.index - match[0].length;
                quill.deleteText(insertPosition, match[0].length);
                quill.insertEmbed(insertPosition, 'mention', {
                  id: member.id,
                  name: member.user?.name || 'Unknown',
                  isCurrentUser: member.user?.id === currentUserId,
                });
                quill.setSelection(insertPosition + 1, 0);
                quill.insertText(insertPosition + 1, ' ');
                quill.setSelection(insertPosition + 2, 0);
                setShowMentionDropdown(false);
                setMentionQuery('');
                setMentionDropdownIndex(0);
                setIsKeyboardNavigation(false);
                setDropdownPos(null);
              } else {
                setShowMentionDropdown(false);
                setMentionQuery('');
                setMentionDropdownIndex(0);
                setIsKeyboardNavigation(false);
                setDropdownPos(null);
              }
            }
          }
          return false;
        }
      } else if (e.key === 'Escape') {
        setShowMentionDropdown(false);
        setMentionQuery('');
        setMentionDropdownIndex(0);
        setIsKeyboardNavigation(false);
        setDropdownPos(null);
        e.preventDefault();
      }
    };

    quill.on('text-change', handleTextChange);
    quill.root.addEventListener('keydown', handleKeyDown, true);

    return () => {
      quill.off('text-change', handleTextChange);
      quill.root.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [quill, members]);

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
        const insertPosition = sel.index - match[0].length;
        quill.deleteText(insertPosition, match[0].length);
        quill.insertEmbed(insertPosition, 'mention', {
          id: member.id,
          name: member.user?.name || 'Unknown',
          isCurrentUser: member.user?.id === currentUserId,
        });
        quill.setSelection(insertPosition + 1, 0);
        quill.insertText(insertPosition + 1, ' ');
        quill.setSelection(insertPosition + 2, 0);
        setShowMentionDropdown(false);
        setMentionQuery('');
        setMentionDropdownIndex(0);
        setIsKeyboardNavigation(false);
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
      className="fixed z-[100] w-80 shadow-lg bg-popover text-popover-foreground rounded-md border"
      style={{
        left: dropdownPos.left,
        bottom: `${window.innerHeight - dropdownPos.top - 20}px`,
      }}
    >
      <div className="max-h-[300px] overflow-y-auto overflow-x-hidden p-1">
        {filteredMembers.map((member, i) => (
          <div
            key={member.id}
            className={cn(
              'relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none',
              i === mentionDropdownIndex
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-accent/50',
            )}
            onClick={() => handleMentionClick(member)}
            onMouseEnter={() => {
              setIsKeyboardNavigation(false);
              setMentionDropdownIndex(i);
            }}
            onMouseLeave={() => {
              setIsKeyboardNavigation(true);
              setMentionDropdownIndex(0);
            }}
          >
            <Avatar className="h-6 w-6 mr-2">
              <AvatarImage src={member.user.image || ''} />
              <AvatarFallback className="text-xs">
                {member.user.name?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{member.user.name}</span>
            {member.user?.id === currentUserId && (
              <span className="ml-1 px-1 py-0.5 rounded bg-muted text-xs text-muted-foreground border border-border">
                you
              </span>
            )}
          </div>
        ))}
        {filteredMembers.length === 0 && (
          <div className="px-3 py-2 text-sm text-muted-foreground">No members found</div>
        )}
      </div>
    </div>
  );
};

export default MentionAutoComplete;
