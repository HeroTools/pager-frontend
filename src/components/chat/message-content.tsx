'use client';

import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import parse, {
  DOMNode,
  domToReact,
  Element as HtmlElement,
  HTMLReactParserOptions,
} from 'html-react-parser';
import { marked, type Tokens } from 'marked';
import { QuillDeltaToHtmlConverter } from 'quill-delta-to-html';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { Hint } from '@/components/hint';
import { useUIStore } from '@/stores/ui-store';

interface QuillDeltaOp {
  insert?: string | { mention?: { id: string; name: string; userId: string } };
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

let markedConfigured = false;

const configureMarked = () => {
  if (markedConfigured) return;

  marked.setOptions({
    breaks: true,
    gfm: true,
  });

  const renderer = new marked.Renderer();

  renderer.code = ({ text, lang }: Tokens.Code) => {
    const validLanguage = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
    const highlighted = hljs.highlight(text, { language: validLanguage }).value;
    return `<pre><code class="hljs language-${validLanguage}">${highlighted}</code></pre>`;
  };

  renderer.codespan = ({ text }: Tokens.Codespan) => {
    return `<code>${text}</code>`;
  };

  renderer.link = ({ href, title, text }: Tokens.Link) => {
    const cleanHref = href.startsWith('http') ? href : `https://${href}`;
    const titleAttr = title ? ` title="${title}"` : '';
    return `<a href="${cleanHref}" target="_blank" rel="noopener noreferrer"${titleAttr}>${text}</a>`;
  };

  marked.use({ renderer });
  markedConfigured = true;
};

configureMarked();

const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
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
      'div',
      'span',
    ],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class', 'src', 'alt', 'data-member-id', 'data-user-id', 'data-name'],
    FORBID_ATTR: ['style'],
    ADD_ATTR: ['target', 'rel'],
    ALLOW_DATA_ATTR: false,
  });
};

const preprocessSlackLinks = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return input;
  }

  let processed = input;

  // Handle HTML-encoded Slack links: &lt;url|label&gt;
  processed = processed.replace(/&lt;([^|]+?)\|([^&]+?)&gt;/g, (match, url, label) => {
    return `[${label.trim()}](${url.trim()})`;
  });

  // Handle regular Slack links: <url|label>
  processed = processed.replace(/<([^|<>]+?)\|([^<>]+?)>/g, (match, url, label) => {
    return `[${label.trim()}](${url.trim()})`;
  });

  // Handle URLs without labels: <url>
  processed = processed.replace(/<(https?:\/\/[^<>\s]+)>/g, (match, url) => {
    return `[${url}](${url})`;
  });

  // Fix malformed markdown links with pipes: [label](url|extra) -> [label](url)
  processed = processed.replace(/\[([^\]]+?)\]\(([^|)]+?)\|[^)]*\)/g, (match, label, url) => {
    return `[${label}](${url})`;
  });

  return processed;
};

export const MessageContent = ({ content }: { content: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hooksConfigured = useRef(false);
  const { setProfilePanelOpen } = useUIStore();

  useEffect(() => {
    if (!hooksConfigured.current) {
      DOMPurify.addHook('afterSanitizeAttributes', (node) => {
        if (node.tagName === 'A') {
          node.setAttribute('target', '_blank');
          node.setAttribute('rel', 'noopener noreferrer');
        }
      });
      hooksConfigured.current = true;
    }
  }, []);

  const cleanHtml = useMemo<string>(() => {
    if (!content.trim()) return '';

    const preprocessed = preprocessSlackLinks(content);
    const format = detectContentFormat(preprocessed);

    try {
      switch (format) {
        case 'delta': {
          const delta = JSON.parse(preprocessed) as QuillDelta;
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
            allowBackgroundClasses: false,
            customTag: (format: string, op: any) => {
              if (format === 'mention' && typeof op.insert === 'object' && op.insert.mention) {
                const { id, name, userId } = op.insert.mention;
                return `<span class="mention" data-member-id="${id}" data-user-id="${userId}" data-name="${name}">@${name}</span>`;
              }
              return undefined;
            },
          });

          const dirty = converter.convert();
          const sanitized = sanitizeHtml(dirty);
          return isContentEmpty(sanitized) ? '' : sanitized;
        }

        case 'markdown': {
          const htmlFromMarkdown = marked(preprocessed) as string;
          const sanitized = sanitizeHtml(htmlFromMarkdown);
          return isContentEmpty(sanitized) ? '' : sanitized;
        }

        case 'html':
        default: {
          const wrapped = /<(p|div|h[1-6]|ul|ol|li|blockquote|pre|table)[^>]*>/i.test(preprocessed)
            ? preprocessed
            : `<p>${preprocessed}</p>`;
          const sanitized = sanitizeHtml(wrapped);
          return isContentEmpty(sanitized) ? '' : sanitized;
        }
      }
    } catch (error) {
      console.error('Error processing message content:', error);
      const sanitized = sanitizeHtml(`<p>${content}</p>`);
      return isContentEmpty(sanitized) ? '' : sanitized;
    }
  }, [content]);

  const replaceFn = useCallback((node: DOMNode): React.ReactElement | undefined => {
    if (node.type === 'tag') {
      const el = node as HtmlElement;

      const cleanAttribs = Object.keys(el.attribs || {}).reduce(
        (acc, key) => {
          const value = el.attribs[key];
          if (key === 'style' || /^\d+$/.test(key)) {
            return acc;
          }
          acc[key] = value;
          return acc;
        },
        {} as Record<string, string>,
      );

      if (el.name === 'a') {
        const href = cleanAttribs.href || '';
        const key = `link-${href.slice(0, 50)}`;

        return (
          <Hint key={key} label={href} side="top" align="center">
            <a {...cleanAttribs}>{domToReact(el.children as DOMNode[])}</a>
          </Hint>
        );
      }
      
      if (el.name === 'span' && el.attribs.class === 'mention') {
        const memberId = el.attribs['data-member-id'];
        const userId = el.attribs['data-user-id'];
        const name = el.attribs['data-name'];
        return (
          <span
            key={`mention-${memberId}-${Math.random()}`}
            className="inline-block bg-blue-500 text-white px-1.5 py-0.5 rounded text-sm cursor-pointer hover:bg-blue-600 transition-colors mx-0.5"
            onClick={() => setProfilePanelOpen(memberId)}
            title={`View ${name}'s profile`}
          >
            @{name}
          </span>
        );
      }
    }
    return undefined;
  }, [setProfilePanelOpen]);

  const parsedContent = useMemo<React.ReactNode>(() => {
    if (!cleanHtml) return null;

    const options: HTMLReactParserOptions = {
      replace: replaceFn,
    };

    return parse(cleanHtml, options);
  }, [cleanHtml, replaceFn]);

  useEffect(() => {
    if (!cleanHtml || !containerRef.current) return;

    const container = containerRef.current;
    const codeBlocks = container.querySelectorAll('pre code:not(.hljs)');

    try {
      codeBlocks.forEach((block) => {
        const element = block as HTMLElement;
        if (element && typeof element.className === 'string') {
          hljs.highlightElement(element);
        }
      });
    } catch (error) {
      console.warn('Error highlighting code blocks:', error);
    }
  }, [cleanHtml]);

  if (!cleanHtml) {
    return null;
  }

  return (
    <div ref={containerRef} className="message-content">
      {parsedContent}
    </div>
  );
};
