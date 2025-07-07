import React, { useEffect, useMemo, useRef } from 'react';
import { QuillDeltaToHtmlConverter } from 'quill-delta-to-html';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import { cn } from '@/lib/utils';

interface MessageContentProps {
  content: string;
}

export const MessageContent: React.FC<MessageContentProps> = ({ content }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const cleanHtml = useMemo(() => {
    let delta;
    try {
      delta = JSON.parse(content);
    } catch {
      return DOMPurify.sanitize(`<p>${content}</p>`);
    }

    const converter = new QuillDeltaToHtmlConverter(delta.ops, {
      encodeHtml: true,
      paragraphTag: 'p',
      classPrefix: 'ql-',
    });

    const dirty = converter.convert();

    return DOMPurify.sanitize(dirty, {
      USE_PROFILES: { html: true },
      ALLOWED_TAGS: [
        'p',
        'div',
        'span',
        'br',
        'strong',
        'b',
        'em',
        'i',
        'u',
        's',
        'strike',
        'a',
        'ul',
        'ol',
        'li',
        'blockquote',
        'pre',
        'code',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'img',
        'video',
        'audio',
        'table',
        'thead',
        'tbody',
        'tr',
        'th',
        'td',
        'sub',
        'sup',
      ],
      ALLOWED_ATTR: [
        'href',
        'target',
        'rel',
        'class',
        'id',
        'src',
        'alt',
        'width',
        'height',
        'style',
        'data-*',
        'colspan',
        'rowspan',
      ],
    });
  }, [content]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block as HTMLElement);
      });
    }
  }, [cleanHtml]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'message-content text-text-foreground max-w-none',
        // Rich text formatting styles
        '[&_strong]:font-bold [&_b]:font-bold',
        '[&_em]:italic [&_i]:italic',
        '[&_u]:underline',
        '[&_s]:line-through [&_strike]:line-through',
        // Lists
        '[&_ul]:list-disc [&_ul]:ml-6 [&_ul]:my-2',
        '[&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:my-2',
        '[&_li]:mb-1',
        // Blockquotes
        '[&_blockquote]:border-l-4 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-4 [&_blockquote]:py-2 [&_blockquote]:my-2 [&_blockquote]:bg-muted/30 [&_blockquote]:italic',
        // Code blocks
        '[&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded-md [&_pre]:my-2 [&_pre]:overflow-x-auto',
        '[&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono',
        '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
        // Links
        '[&_a]:text-blue-600 [&_a]:underline hover:[&_a]:text-blue-800',
        // Paragraphs
        '[&_p]:mb-2 [&_p:last-child]:mb-0'
      )}
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        fontSize: '14px',
        lineHeight: '1.42',
        wordWrap: 'break-word',
        whiteSpace: 'pre-wrap',
      }}
    />
  );
};
