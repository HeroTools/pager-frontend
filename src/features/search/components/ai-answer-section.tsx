import { Sparkles } from 'lucide-react';
import { useCallback } from 'react';

export const AIAnswerSection = ({
  answer,
  references,
  onReferenceClick,
}: {
  answer: string;
  references: { messageId: string; index: number }[];
  onReferenceClick: (messageId: string) => void;
}) => {
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
