import React, { useEffect, useMemo, useRef } from 'react';
import { QuillDeltaToHtmlConverter } from 'quill-delta-to-html';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';

interface MessageContentProps {
  content: string;
}

export const MessageContent = ({ content }: MessageContentProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Configure DOMPurify to force target="_blank" on all links
  DOMPurify.addHook('afterSanitizeAttributes', function(node) {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
      
      // Ensure the title shows the actual URL
      const url = node.getAttribute('href');
      if (url) {
        node.setAttribute('title', url);
      }
    }
  });

  const cleanHtml = useMemo(() => {
    let delta;
    try {
      delta = JSON.parse(content);
    } catch {
      return DOMPurify.sanitize(`<p>${content}</p>`);
    }

    // Normalize URLs in delta before conversion
    const normalizedOps = delta.ops.map((op: any) => {
      if (op.attributes && op.attributes.link) {
        const url = op.attributes.link;
        // Add protocol if missing and not a mailto link
        if (url && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:')) {
          op.attributes.link = `https://${url}`;
        }
      }
      return op;
    });

    const converter = new QuillDeltaToHtmlConverter(normalizedOps, {
      encodeHtml: true,
      paragraphTag: 'p',
      classPrefix: 'ql-',
      inlineStyles: false,
      multiLineBlockquote: true,
      multiLineHeader: true,
      multiLineCodeblock: true,
      linkTarget: '_blank',
      allowBackgroundClasses: true,
      customTagAttributes: {
        a: (op: any) => {
          const href = op.attributes?.link || '';
          return {
            target: '_blank',
            rel: 'noopener noreferrer',
            title: href,
          };
        },
      },
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
        'title',
      ],
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|xxx):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
      ADD_ATTR: ['target', 'rel'], // Ensure these attributes are always kept
    });
  }, [content]);

  useEffect(() => {
    if (containerRef.current) {
      // Highlight code blocks
      containerRef.current.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block as HTMLElement);
      });

      // Add click handler to ensure links always open in new tab
      containerRef.current.querySelectorAll('a').forEach((link) => {
        // Remove any existing click handlers
        const newLink = link.cloneNode(true) as HTMLAnchorElement;
        link.parentNode?.replaceChild(newLink, link);
        
        newLink.addEventListener('click', (e) => {
          e.preventDefault();
          const href = newLink.getAttribute('href');
          if (href) {
            window.open(href, '_blank', 'noopener,noreferrer');
          }
        });

        // Get the actual URL (either from href or text content)
        let url = newLink.href || newLink.textContent?.trim() || '';
        
        // If URL is from text and doesn't have a protocol, add https
        if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:')) {
          url = `https://${url}`;
        }

        // Set the title to the actual URL, not the display text
        newLink.setAttribute('title', url);
        
        // If no href but has text that looks like a URL, add it
        if (!newLink.href) {
          const text = newLink.textContent?.trim();
          if (text && (text.startsWith('http') || text.includes('.'))) {
            newLink.setAttribute('href', url);
          }
        }
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
