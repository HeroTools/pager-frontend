import React, { useEffect, useMemo, useRef } from 'react';
import { QuillDeltaToHtmlConverter } from 'quill-delta-to-html';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import { createRoot } from 'react-dom/client';
import { Hint } from '@/components/hint';

interface MessageContentProps {
  content: string;
}

export const MessageContent = ({ content }: MessageContentProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  DOMPurify.addHook('afterSanitizeAttributes', function(node) {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
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
      ],
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|xxx):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
      ADD_ATTR: ['target', 'rel'], 
    });
  }, [content]);

  useEffect(() => {
    if (containerRef.current) {
      
      containerRef.current.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block as HTMLElement);
      });

      // Add click handler to ensure links always open in new tab
      containerRef.current.querySelectorAll('a').forEach((link) => {
        
        let url = link.href || link.textContent?.trim() || '';
        
        if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:')) {
          url = `https://${url}`;
        }

        if (!link.href) {
          const text = link.textContent?.trim();
          if (text && (text.startsWith('http') || text.includes('.'))) {
            link.setAttribute('href', url);
          }
        }

        const wrapper = document.createElement('span');
        wrapper.style.display = 'inline-block'; 
        
        while (link.firstChild) {
          wrapper.appendChild(link.firstChild);
        }

        const root = createRoot(wrapper);
        root.render(
          <Hint 
            label={url} 
            side="top" 
            align="center"
            children={
              <span 
                className="inline-block"
                dangerouslySetInnerHTML={{ __html: wrapper.innerHTML }}
              />
            }
          />
        );

        link.innerHTML = '';
        link.appendChild(wrapper);

        link.addEventListener('click', (e) => {
          e.preventDefault();
          const href = link.getAttribute('href');
          if (href) {
            window.open(href, '_blank', 'noopener,noreferrer');
          }
        });
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
