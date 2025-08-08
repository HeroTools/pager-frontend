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
import { useGetMembers } from '@/features/members/hooks/use-members';
import { useWorkspaceId } from '@/hooks/use-workspace-id';
import { createMemberLookupMap } from '@/lib/helpers/members';

interface QuillDeltaOp {
  insert?: string | { mention?: { id: string } };
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
    ALLOWED_ATTR: [
      'href',
      'title',
      'target',
      'rel',
      'class',
      'src',
      'alt',
      'data-member-id',
      'data-name',
    ],
    FORBID_ATTR: ['style'],
    ADD_ATTR: ['target', 'rel'],
    ALLOW_DATA_ATTR: false,
  });
};

const preprocessLinks = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return input;
  }

  let processed = input;

  // Handle HTML-encoded links: &lt;url|label&gt;
  processed = processed.replace(/&lt;([^|]+?)\|([^&]+?)&gt;/g, (_, url, label) => {
    return `[${label.trim()}](${url.trim()})`;
  });

  // Handle links with labels: <url|label>
  processed = processed.replace(/<([^|<>]+?)\|([^<>]+?)>/g, (_, url, label) => {
    return `[${label.trim()}](${url.trim()})`;
  });

  // Handle plain URLs: <url>
  processed = processed.replace(/<(https?:\/\/[^<>\s]+)>/g, (_, url) => {
    return `[${url}](${url})`;
  });

  // Fix malformed markdown links: [label](url|extra) -> [label](url)
  processed = processed.replace(/\[([^\]]+?)\]\(([^|)]+?)\|[^)]*\)/g, (_, label, url) => {
    return `[${label}](${url})`;
  });

  return processed;
};

export const MessageContent = ({ content, currentUserId }: { content: string; currentUserId?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hooksConfigured = useRef(false);
  const { setProfilePanelOpen } = useUIStore();
  const workspaceId = useWorkspaceId();
  const { data: members = [] } = useGetMembers(workspaceId || '');

  // Create a memoized lookup map for performance
  const memberLookup = useMemo(() => createMemberLookupMap(members), [members]);

  useEffect(() => {
    if (!hooksConfigured.current) {
      DOMPurify.addHook('afterSanitizeAttributes', (node: Element) => {
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

    const preprocessed = preprocessLinks(content);
    const format = detectContentFormat(preprocessed);

    try {
      switch (format) {
        case 'delta': {
          const delta = JSON.parse(preprocessed) as QuillDelta;
          if (isDeltaEmpty(delta)) return '';

          const mentions: Array<{
            placeholder: string;
            id: string;
            name: string;
          }> = [];

          const processedOps = delta.ops.map((op, index) => {
            if (op.insert && typeof op.insert === 'object' && 'mention' in op.insert) {
              const placeholder = `__MENTION_${index}_${Date.now()}__`;
              const memberId = op.insert.mention.id;
              const memberName = memberLookup.get(memberId) || 'Unknown';
              mentions.push({ placeholder, id: memberId, name: memberName });
              return { insert: placeholder };
            }

            if (typeof op.insert === 'string' && op.attributes?.link) {
              const url = String(op.attributes.link);
              return {
                ...op,
                attributes: {
                  ...op.attributes,
                  link:
                    /^https?:\/\//.test(url) || url.startsWith('mailto:') ? url : `https://${url}`,
                },
              };
            }

            return op;
          });

          const converter = new QuillDeltaToHtmlConverter(processedOps, {
            encodeHtml: true,
            paragraphTag: 'p',
            linkTarget: '_blank',
            classPrefix: 'ql-',
            inlineStyles: false,
            multiLineCodeblock: true,
            multiLineHeader: true,
            multiLineBlockquote: true,
            allowBackgroundClasses: false,
          });

          let html = converter.convert();

          mentions.forEach(({ placeholder, id, name }) => {
            const mentionHtml = `<span class="mention" data-member-id="${id}">@${name}</span>`;
            html = html.replace(placeholder, mentionHtml);
          });

          const sanitized = sanitizeHtml(html);
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
      const sanitized = sanitizeHtml(`<p>${content}</p>`);
      return isContentEmpty(sanitized) ? '' : sanitized;
    }
  }, [content, memberLookup]);

  const replaceFn = useCallback(
    (node: DOMNode): React.ReactElement | undefined => {
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
          const memberName = memberLookup.get(memberId) || 'Unknown';
          const member = members.find(m => m.id === memberId);
          const isCurrentUser = member?.user?.id === currentUserId;
          
          // Techy minimalist styling to match editor
          const baseClasses = 'inline-block px-1 py-0 rounded text-sm cursor-pointer transition-colors mx-0.5';
          const colorClasses = isCurrentUser 
            ? 'bg-green-500/20 text-green-500 hover:bg-green-500/40' 
            : 'bg-blue-500/20 text-blue-500 hover:bg-blue-500/40';
          
          return (
            <span
              key={`mention-${memberId}-${Math.random()}`}
              className={`${baseClasses} ${colorClasses}`}
              onClick={() => setProfilePanelOpen(memberId)}
              title={`View ${memberName}'s profile`}
            >
              @{memberName}
            </span>
          );
        }
      }
      return undefined;
    },
    [setProfilePanelOpen, memberLookup],
  );

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
      // Silently fail - highlighting is not critical
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
