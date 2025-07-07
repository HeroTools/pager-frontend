import React, { useEffect, useMemo, useRef } from 'react';
import { QuillDeltaToHtmlConverter } from 'quill-delta-to-html';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';

interface MessageContentProps {
  content: string;
}

export const MessageContent = ({ content }: MessageContentProps) => {
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
      inlineStyles: false,
      multiLineBlockquote: true,
      multiLineHeader: true,
      multiLineCodeblock: true,
    });

    const dirty = converter.convert();
    
    // Debug: log the converted HTML if it contains blockquote
    if (dirty.includes('blockquote') || dirty.includes('ql-blockquote')) {
      console.log('Blockquote HTML:', dirty);
    }

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
      // Highlight code blocks
      containerRef.current.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block as HTMLElement);
      });

      // Add target="_blank" to links for new tab opening
      containerRef.current.querySelectorAll('a').forEach((link) => {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        link.setAttribute('title', link.href); // Show URL in native tooltip
      });
    }
  }, [cleanHtml]);

  return (
    <div
      ref={containerRef}
      className="message-content"
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
};
