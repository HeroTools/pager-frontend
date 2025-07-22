'use client';

import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import parse, {
  DOMNode,
  domToReact,
  Element as HtmlElement,
  HTMLReactParserOptions,
} from 'html-react-parser';
import { marked, Tokens } from 'marked';
import { QuillDeltaToHtmlConverter } from 'quill-delta-to-html';
import React, { useEffect, useMemo, useRef } from 'react';

import { Hint } from '@/components/hint';

interface QuillDeltaOp {
  insert?: string;
  attributes?: {
    link?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface QuillDelta {
  ops: QuillDeltaOp[];
}

type ContentFormat = 'delta' | 'markdown' | 'html';

const isContentEmpty = (html: string): boolean => {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent?.trim().length === 0;
};

const isDeltaEmpty = (delta: QuillDelta): boolean =>
  !delta.ops ||
  delta.ops.every((op) => (typeof op.insert === 'string' ? op.insert.trim().length === 0 : true));

const detectContentFormat = (content: string): ContentFormat => {
  try {
    const parsed = JSON.parse(content);
    if (parsed.ops && Array.isArray(parsed.ops)) {
      return 'delta';
    }
  } catch {
    // Not JSON, continue with other checks
  }

  // Check for common markdown patterns
  if (
    content.includes('# ') ||
    content.includes('## ') ||
    content.includes('**') ||
    content.includes('```') ||
    content.includes('- ') ||
    content.includes('* ') ||
    /^\d+\. /.test(content) ||
    (content.includes('[') && content.includes(']('))
  ) {
    return 'markdown';
  }

  return 'html';
};

const configureMarked = () => {
  marked.setOptions({
    breaks: true,
    gfm: true,
  });

  // Custom renderer for better code block handling
  const renderer = new marked.Renderer();

  renderer.code = ({ text, lang }: Tokens.Code) => {
    const validLanguage = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
    const highlighted = hljs.highlight(text, { language: validLanguage }).value;
    return `<pre><code class="hljs language-${validLanguage}">${highlighted}</code></pre>`;
  };

  renderer.codespan = ({ text }: Tokens.Codespan) => {
    return `<code>${text}</code>`;
  };

  renderer.link = ({ href, title, tokens }: Tokens.Link) => {
    const cleanHref = href.startsWith('http') ? href : `https://${href}`;
    const titleAttr = title ? ` title="${title}"` : '';
    return `<a href="${cleanHref}" target="_blank" rel="noopener noreferrer"${titleAttr}>${tokens}</a>`;
  };

  marked.use({ renderer });
};

export const MessageContent = ({ content }: { content: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });

  const cleanHtml = useMemo<string>(() => {
    if (!content.trim()) return '';

    const format = detectContentFormat(content);

    try {
      switch (format) {
        case 'delta': {
          const delta = JSON.parse(content) as QuillDelta;
          if (isDeltaEmpty(delta)) return '';

          const normalized = delta.ops.map((op) => {
            if (op.attributes?.link) {
              let url = String(op.attributes.link);
              if (!/^https?:\/\//.test(url) && !url.startsWith('mailto:')) {
                url = `https://${url}`;
              }
              op.attributes.link = url;
            }
            return op;
          });

          const converter = new QuillDeltaToHtmlConverter(normalized, {
            encodeHtml: true,
            paragraphTag: 'p',
            linkTarget: '_blank',
            classPrefix: 'ql-',
            inlineStyles: false,
            multiLineCodeblock: true,
            multiLineHeader: true,
            multiLineBlockquote: true,
            allowBackgroundClasses: true,
          });

          const dirty = converter.convert();
          const sanitized = DOMPurify.sanitize(dirty);
          return isContentEmpty(sanitized) ? '' : sanitized;
        }

        case 'markdown': {
          configureMarked();
          const htmlFromMarkdown = marked(content) as string;
          const sanitized = DOMPurify.sanitize(htmlFromMarkdown, {
            ALLOWED_TAGS: [
              'p',
              'br',
              'strong',
              'b',
              'em',
              'i',
              'u',
              's',
              'strike',
              'h1',
              'h2',
              'h3',
              'h4',
              'h5',
              'h6',
              'ul',
              'ol',
              'li',
              'blockquote',
              'pre',
              'code',
              'a',
              'table',
              'thead',
              'tbody',
              'tr',
              'th',
              'td',
              'img',
            ],
            ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class', 'src', 'alt'],
          });
          return isContentEmpty(sanitized) ? '' : sanitized;
        }

        case 'html':
        default: {
          const wrapped = /<(p|div|h[1-6]|ul|ol|li|blockquote|pre|table)[^>]*>/i.test(content)
            ? content
            : `<p>${content}</p>`;
          const sanitized = DOMPurify.sanitize(wrapped);
          return isContentEmpty(sanitized) ? '' : sanitized;
        }
      }
    } catch (error) {
      console.error('Error processing message content:', error);
      const sanitized = DOMPurify.sanitize(`<p>${content}</p>`);
      return isContentEmpty(sanitized) ? '' : sanitized;
    }
  }, [content]);

  const parsedContent = useMemo<React.ReactNode>(() => {
    if (!cleanHtml) return null;

    const options: HTMLReactParserOptions = {
      replace: (node) => {
        if (node.type === 'tag' && (node as HtmlElement).name === 'a') {
          const el = node as HtmlElement;
          const href = el.attribs.href || '';
          return (
            <Hint key={href + Math.random()} label={href} side="top" align="center">
              <a {...el.attribs}>{domToReact(el.children as DOMNode[], options)}</a>
            </Hint>
          );
        }
        return undefined;
      },
    };

    return parse(cleanHtml, options);
  }, [cleanHtml]);

  useEffect(() => {
    if (!cleanHtml) return;

    // Handle code blocks that weren't processed by marked (for non-markdown content)
    containerRef.current
      ?.querySelectorAll('pre code:not(.hljs)')
      .forEach((block) => hljs.highlightElement(block as HTMLElement));
  }, [cleanHtml, parsedContent]);

  if (!cleanHtml) {
    return null;
  }

  return (
    <div ref={containerRef} className="message-content">
      {parsedContent}
    </div>
  );
};
