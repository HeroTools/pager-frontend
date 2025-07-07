import { Hash, Loader2, Search, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDebounce } from 'use-debounce';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

import { useGetAllAvailableChannels } from '@/features/channels/hooks/use-channels-mutations';
import { useGetMembers } from '@/features/members/hooks/use-members';
import { useWorkspaceId } from '@/hooks/use-workspace-id';
import { useSearch } from '@/features/search/hooks/use-search';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const AIAnswerSection = ({
  answer,
  references,
  onReferenceClick,
}: {
  answer: string;
  references: { messageId: string; index: number }[];
  onReferenceClick: (messageId: string) => void;
}) => {
  // Handles citation rendering/click
  const processAnswer = useCallback(
    (text: string) =>
      text.replace(/\[(\d+)\]/g, (match, num) => {
        const ref = references.find((r) => r.index === parseInt(num));
        if (ref) {
          return `<button class="citation-link" data-message-id="${ref.messageId}">[${num}]</button>`;
        }
        return match;
      }),
    [references],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('citation-link')) {
        const messageId = target.getAttribute('data-message-id');
        if (messageId) {
          onReferenceClick(messageId);
        }
      }
    },
    [onReferenceClick],
  );

  return (
    <div className="p-4 bg-accent/30 rounded-lg border">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="size-4 text-brand-blue" />
        <span className="font-medium text-sm">AI Summary</span>
      </div>
      <div
        className="text-sm text-foreground leading-relaxed [&_.citation-link]:text-brand-blue [&_.citation-link]:hover:underline [&_.citation-link]:cursor-pointer"
        dangerouslySetInnerHTML={{ __html: processAnswer(answer) }}
        onClick={handleClick}
      />
    </div>
  );
};

export const Toolbar = () => {
  const router = useRouter();
  const workspaceId = useWorkspaceId() as string;

  const { data: channels } = useGetAllAvailableChannels(workspaceId);
  const { data: members } = useGetMembers(workspaceId);

  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [debouncedQuery] = useDebounce(inputValue, 800);

  const shouldSearchMessages = debouncedQuery.trim().length >= 2;

  // Remote search (debounced)
  const { data: searchData, isLoading: isSearching } = useSearch(workspaceId, debouncedQuery, {
    includeThreads: true,
    limit: 15,
  });

  // Always filter channels/members locally
  const filteredChannels = useMemo(() => {
    if (!inputValue.trim() || !channels) {
      return channels?.slice(0, 5) || [];
    }
    const query = inputValue.toLowerCase();
    return channels.filter((channel) => channel.name.toLowerCase().includes(query)).slice(0, 5);
  }, [channels, inputValue]);

  const filteredMembers = useMemo(() => {
    if (!inputValue.trim() || !members) {
      return members?.slice(0, 5) || [];
    }
    const query = inputValue.toLowerCase();
    return members.filter((member) => member.user.name.toLowerCase().includes(query)).slice(0, 5);
  }, [members, inputValue]);

  // Click handlers
  const handleChannelClick = useCallback(
    (channelId: string) => () => {
      setOpen(false);
      router.push(`/${workspaceId}/c-${channelId}`);
    },
    [workspaceId, router],
  );
  const handleMemberClick = useCallback(
    (memberId: string) => () => {
      setOpen(false);
      router.push(`/${workspaceId}/d-${memberId}`);
    },
    [workspaceId, router],
  );
  const handleMessageClick = useCallback(
    (messageId: string) => () => {
      setOpen(false);
      router.push(`/${workspaceId}/m-${messageId}`);
    },
    [workspaceId, router],
  );

  // Reset input on dialog close
  useEffect(() => {
    if (!open) {
      setInputValue('');
    }
  }, [open]);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const uniqueResults = useMemo(() => {
    const seen = new Set();
    return (searchData?.results || []).filter((r) => {
      if (seen.has(r.messageId)) {
        return false;
      }
      seen.add(r.messageId);
      return true;
    });
  }, [searchData?.results]);

  const hasMessageResults = uniqueResults.length > 0;
  const hasAnswer = !!searchData?.answer;

  const Section = ({ title, children }: any) =>
    children && Array.isArray(children) && children.length > 0 ? (
      <div className="mb-3">
        <div className="text-xs font-semibold text-muted-foreground mb-1 px-2">{title}</div>
        <div className="flex flex-col gap-1">{children}</div>
      </div>
    ) : null;

  return (
    <div className="flex items-center justify-between h-10 p-1.5 border-b border-border-subtle">
      <div className="flex-1" />
      <div className="min-w-[280px] max-w-[642px] flex-1">
        <Button
          size="sm"
          className="border hover:bg-accent w-full justify-start h-7 px-2 bg-background"
          onClick={() => setOpen(true)}
        >
          <Search className="size-4 text-muted-foreground mr-2" />
          <span className="text-muted-foreground text-xs">Search</span>
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg w-full bg-background rounded-xl p-0 overflow-hidden">
            <div className="border-b border-border-subtle p-3 flex items-center gap-2">
              <Search className="size-4 text-muted-foreground" />
              <input
                className="flex-1 bg-transparent outline-none text-base px-2"
                placeholder="Search messages, channels, or people…"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                autoFocus
              />
            </div>
            <div className="max-h-[400px] overflow-y-auto px-2 py-3">
              <Section title="Channels">
                {(filteredChannels || []).map((channel) => (
                  <button
                    key={channel.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-accent w-full text-left"
                    onClick={() => handleChannelClick(channel.id)}
                  >
                    <Hash className="size-4" />
                    <span>{channel.name}</span>
                  </button>
                ))}
              </Section>

              {/* People */}
              <Section title="People">
                {(filteredMembers || []).map((member) => (
                  <button
                    key={member.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-accent w-full text-left"
                    onClick={() => handleMemberClick(member.id)}
                  >
                    <Avatar className="size-5">
                      <AvatarImage src={member.user.image} alt={member.user.name} />
                      <AvatarFallback>{member.user.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span>{member.user.name}</span>
                  </button>
                ))}
              </Section>

              {/* AI Summary */}
              {searchData?.answer && (
                <div className="mb-3 px-2">
                  <AIAnswerSection
                    answer={searchData.answer}
                    references={searchData.references}
                    onReferenceClick={handleMessageClick}
                  />
                </div>
              )}

              {/* Messages (remote) */}
              {isSearching && (
                <div className="flex items-center gap-2 justify-center text-sm py-8">
                  <Loader2 className="size-4 animate-spin" />
                  Searching messages…
                </div>
              )}
              {!isSearching && uniqueResults.length > 0 && (
                <Section title={`Messages (${uniqueResults.length})`}>
                  {uniqueResults.map((result) => (
                    <button
                      key={result.messageId}
                      className="flex items-start gap-3 p-2 rounded hover:bg-accent w-full text-left"
                      onClick={() => handleMessageClick(result.messageId)}
                    >
                      <Avatar className="size-6 mt-0.5">
                        <AvatarImage src={result.authorImage || ''} alt={result.authorName} />
                        <AvatarFallback className="text-xs">
                          {result.authorName?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">{result.authorName}</span>
                          <span className="truncate text-xs text-muted-foreground">
                            {result.channelName || 'DM'}
                          </span>
                        </div>
                        <p className="text-sm line-clamp-2 leading-relaxed">{result.content}</p>
                        {result.isThread && (
                          <Badge variant="secondary" className="mt-1 text-xs">
                            Thread
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </Section>
              )}

              {/* Empty state */}
              {inputValue &&
                !isSearching &&
                uniqueResults.length === 0 &&
                (filteredChannels?.length ?? 0) === 0 &&
                (filteredMembers?.length ?? 0) === 0 &&
                !searchData?.answer && (
                  <div className="text-muted-foreground text-center py-10">
                    No results found for <span className="font-semibold">{inputValue}</span>
                  </div>
                )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
