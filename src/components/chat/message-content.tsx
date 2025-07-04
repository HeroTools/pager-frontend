import React, { useEffect, useMemo, useRef } from 'react';
import { QuillDeltaToHtmlConverter } from 'quill-delta-to-html';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';

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
      className="message-content text-text-foreground"
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
