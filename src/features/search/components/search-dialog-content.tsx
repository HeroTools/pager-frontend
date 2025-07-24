import { Loader2, Search } from 'lucide-react';
import { useEffect } from 'react';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useSearchDialog } from '@/features/search/hooks/use-search-dialog';
import { Section } from './section';
import { AIAnswerSection } from './ai-answer-section';
import { ChannelItem, MemberItem, MessageItem } from './search-items';

const LoadingState = () => (
  <div className="flex items-center gap-2 justify-center text-sm py-8">
    <Loader2 className="size-4 animate-spin" />
    Searching messages…
  </div>
);

const EmptyState = ({ query }: { query: string }) => (
  <div className="text-muted-foreground text-center py-10">
    No results found for <span className="font-semibold">{query}</span>
  </div>
);

export const SearchDialogContent = ({ workspaceId }: { workspaceId: string }) => {
  const {
    open,
    setOpen,
    inputValue,
    setInputValue,
    searchData,
    isSearching,
    filteredChannels,
    filteredMembers,
    uniqueResults,
    creatingConversationWith,
    handleChannelClick,
    handleMemberClick,
    handleMessageClick,
    handleLegacyMessageClick,
    resetInput,
  } = useSearchDialog(workspaceId);

  useEffect(() => {
    if (!open) {
      resetInput();
    }
  }, [open, resetInput]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setOpen]);

  const hasResults =
    filteredChannels.length > 0 ||
    filteredMembers.length > 0 ||
    uniqueResults.length > 0 ||
    Boolean(searchData?.answer);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg w-full bg-background rounded-xl p-0 overflow-hidden">
        <div className="border-b border-border-subtle p-4 flex items-center gap-2">
          <Search className="size-4 text-muted-foreground" />
          <input
            className="flex-1 bg-transparent outline-none text-base px-4"
            placeholder="Search messages, channels, or people…"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoFocus
            aria-label="Search messages, channels, or people"
            role="searchbox"
          />
        </div>

        <div className="max-h-96 overflow-y-auto px-4 py-4">
          <Section title="Channels">
            {filteredChannels.map((channel) => (
              <ChannelItem
                key={channel.id}
                channel={channel}
                onClick={handleChannelClick(channel.id)}
              />
            ))}
          </Section>

          <Section title="People">
            {filteredMembers.map((member) => (
              <MemberItem
                key={member.id}
                member={member}
                onClick={handleMemberClick(member.id)}
                isCreating={creatingConversationWith === member.id}
              />
            ))}
          </Section>

          {searchData?.answer && (
            <div className="mb-4 px-4">
              <AIAnswerSection
                answer={searchData.answer}
                references={searchData.references}
                onReferenceClick={handleLegacyMessageClick}
              />
            </div>
          )}

          {isSearching && <LoadingState />}

          {!isSearching && uniqueResults.length > 0 && (
            <Section title={`Messages (${uniqueResults.length})`}>
              {uniqueResults.map((result) => (
                <MessageItem
                  key={result.messageId}
                  result={result}
                  onClick={handleMessageClick(result)}
                />
              ))}
            </Section>
          )}

          {inputValue && !isSearching && !hasResults && <EmptyState query={inputValue} />}
        </div>
      </DialogContent>
    </Dialog>
  );
};
