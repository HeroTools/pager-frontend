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
import { useGetMembers } from '@/features/members/hooks/use-members';
import { useWorkspaceId } from '@/hooks/use-workspace-id';
import { createMemberLookupMap } from '@/lib/helpers/members';
import { useUIStore } from '@/stores/ui-store';

interface QuillDeltaOp {
  insert?: string | { mention?: { id: string } } | { image?: string };
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

interface ProcessedContent {
  html: string;
  isEmpty: boolean;
}

interface MentionData {
  placeholder: string;
  id: string;
  name: string;
}

interface EmbedData {
  placeholder: string;
  url: string;
}

const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:'];

const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return ALLOWED_PROTOCOLS.includes(parsed.protocol);
  } catch {
    return false;
  }
};

const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const isContentEmpty = (html: string): boolean => {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const hasText = !!tmp.textContent?.trim();
  const hasImages = tmp.querySelectorAll('img, video').length > 0;
  return !hasText && !hasImages;
};

const isDeltaEmpty = (delta: QuillDelta): boolean =>
  !delta.ops ||
  delta.ops.every((op) => {
    if (typeof op.insert === 'string') {
      return !op.insert.trim();
    } else if (op.insert && typeof op.insert === 'object') {
      return false;
    }
    return true;
  });

const detectContentFormat = (content: string): ContentFormat => {
  try {
    const parsed = JSON.parse(content);
    if (parsed.ops && Array.isArray(parsed.ops)) {
      return 'delta';
    }
  } catch {
    // Continue to other format checks
  }

  const markdownPatterns = [
    /^#{1,6}\s/m,
    /\*\*.*\*\*/,
    /```[\s\S]*```/,
    /^[-*+]\s/m,
    /^\d+\.\s/m,
    /\[.*\]\(.*\)/,
  ];

  if (markdownPatterns.some((pattern) => pattern.test(content))) {
    return 'markdown';
  }

  return 'html';
};

class ContentProcessor {
  private memberLookup: Map<string, string>;

  constructor(memberLookup: Map<string, string>) {
    this.memberLookup = memberLookup;
  }

  private preprocessLinks(input: string): string {
    if (!input || typeof input !== 'string') {
      return input;
    }

    return input
      .replace(/&lt;([^|]+?)\|([^&]+?)&gt;/g, (_, url, label) => `[${label.trim()}](${url.trim()})`)
      .replace(/<([^|<>]+?)\|([^<>]+?)>/g, (_, url, label) => `[${label.trim()}](${url.trim()})`)
      .replace(/<(https?:\/\/[^<>\s]+)>/g, (_, url) => `[${url}](${url})`)
      .replace(/\[([^\]]+?)\]\(([^|)]+?)\|[^)]*\)/g, (_, label, url) => `[${label}](${url})`);
  }

  private sanitizeHtml(html: string): string {
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
  }

  private processDeltaContent(delta: QuillDelta): ProcessedContent {
    if (isDeltaEmpty(delta)) {
      return { html: '', isEmpty: true };
    }

    const mentions: MentionData[] = [];
    const embeds: EmbedData[] = [];

    const processedOps = delta.ops.map((op, index) => {
      if (op.insert && typeof op.insert === 'object') {
        if ('mention' in op.insert) {
          const placeholder = `__MENTION_${index}_${Date.now()}__`;
          const memberId =
            typeof op.insert.mention === 'object' ? op.insert.mention.id : op.insert.mention;
          const memberName = this.memberLookup.get(memberId) || 'Unknown';
          mentions.push({ placeholder, id: memberId, name: memberName });
          return { insert: placeholder };
        }

        if ('image' in op.insert) {
          const placeholder = `__IMAGE_${index}_${Date.now()}__`;
          embeds.push({ placeholder, url: op.insert.image });
          return { insert: placeholder };
        }
      }

      if (typeof op.insert === 'string' && op.attributes?.link) {
        const url = String(op.attributes.link);
        if (isValidUrl(url)) {
          return {
            ...op,
            attributes: {
              ...op.attributes,
              link: url.startsWith('http') || url.startsWith('mailto:') ? url : `https://${url}`,
            },
          };
        }
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
      const mentionHtml = `<span class="mention" data-member-id="${escapeHtml(id)}">@${escapeHtml(name)}</span>`;
      html = html.replace(placeholder, mentionHtml);
    });

    embeds.forEach(({ placeholder, url }) => {
      if (isValidUrl(url)) {
        const imageHtml = `<img src="${escapeHtml(url)}" alt="Embedded image" class="max-w-full h-auto rounded-lg" />`;
        html = html.replace(placeholder, imageHtml);
      }
    });

    const sanitized = this.sanitizeHtml(html);
    return { html: sanitized, isEmpty: isContentEmpty(sanitized) };
  }

  private processMarkdownContent(content: string): ProcessedContent {
    const htmlFromMarkdown = marked(content) as string;
    const sanitized = this.sanitizeHtml(htmlFromMarkdown);
    return { html: sanitized, isEmpty: isContentEmpty(sanitized) };
  }

  private processHtmlContent(content: string): ProcessedContent {
    const wrapped = /<(p|div|h[1-6]|ul|ol|li|blockquote|pre|table)[^>]*>/i.test(content)
      ? content
      : `<p>${content}</p>`;
    const sanitized = this.sanitizeHtml(wrapped);
    return { html: sanitized, isEmpty: isContentEmpty(sanitized) };
  }

  process(content: string): ProcessedContent {
    if (!content.trim()) {
      return { html: '', isEmpty: true };
    }

    const preprocessed = this.preprocessLinks(content);
    const format = detectContentFormat(preprocessed);

    try {
      switch (format) {
        case 'delta': {
          const delta = JSON.parse(preprocessed) as QuillDelta;
          return this.processDeltaContent(delta);
        }
        case 'markdown':
          return this.processMarkdownContent(preprocessed);
        case 'html':
        default:
          return this.processHtmlContent(preprocessed);
      }
    } catch (error) {
      const sanitized = this.sanitizeHtml(`<p>${escapeHtml(content)}</p>`);
      return { html: sanitized, isEmpty: isContentEmpty(sanitized) };
    }
  }
}

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

  renderer.codespan = ({ text }: Tokens.Codespan) => `<code>${text}</code>`;

  renderer.link = ({ href, title, text }: Tokens.Link) => {
    if (!isValidUrl(href)) return text;
    const cleanHref = href.startsWith('http') ? href : `https://${href}`;
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
    return `<a href="${escapeHtml(cleanHref)}" target="_blank" rel="noopener noreferrer"${titleAttr}>${text}</a>`;
  };

  marked.use({ renderer });
  markedConfigured = true;
};

configureMarked();

export const MessageContent = ({
  content,
  currentUserId,
}: {
  content: string;
  currentUserId?: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hooksConfigured = useRef(false);
  const { setProfilePanelOpen } = useUIStore();
  const workspaceId = useWorkspaceId();
  const { data: members = [] } = useGetMembers(workspaceId || '');

  const memberLookup = useMemo(() => createMemberLookupMap(members), [members]);

  const processor = useMemo(() => new ContentProcessor(memberLookup), [memberLookup]);

  const processedContent = useMemo(() => processor.process(content), [processor, content]);

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

  const replaceFn = useCallback(
    (node: DOMNode): React.ReactElement | undefined => {
      if (node.type !== 'tag') return undefined;

      const el = node as HtmlElement;
      const cleanAttribs = Object.fromEntries(
        Object.entries(el.attribs || {}).filter(([key]) => key !== 'style' && !/^\d+$/.test(key)),
      );

      if (el.name === 'a') {
        const href = cleanAttribs.href || '';
        return (
          <Hint key={`link-${href.slice(0, 50)}`} label={href} side="top" align="center">
            <a {...cleanAttribs}>{domToReact(el.children as DOMNode[])}</a>
          </Hint>
        );
      }

      if (el.name === 'span' && el.attribs.class === 'mention') {
        const memberId = el.attribs['data-member-id'];
        const memberName = memberLookup.get(memberId) || 'Unknown';
        const member = members.find((m: any) => m.id === memberId);
        const isCurrentUser = member?.user?.id === currentUserId;

        const baseClasses =
          'inline-block px-1 py-0 rounded text-sm cursor-pointer transition-colors mx-0.5';
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

      return undefined;
    },
    [setProfilePanelOpen, memberLookup, members, currentUserId],
  );

  const parsedContent = useMemo<React.ReactNode>(() => {
    if (processedContent.isEmpty) return null;

    const options: HTMLReactParserOptions = { replace: replaceFn };
    return parse(processedContent.html, options);
  }, [processedContent.html, processedContent.isEmpty, replaceFn]);

  useEffect(() => {
    if (processedContent.isEmpty || !containerRef.current) return;

    const container = containerRef.current;
    const codeBlocks = container.querySelectorAll('pre code:not(.hljs)');

    try {
      codeBlocks.forEach((block) => {
        const element = block as HTMLElement;
        if (element?.className && typeof element.className === 'string') {
          hljs.highlightElement(element);
        }
      });
    } catch {
      // Highlighting failure is non-critical
    }
  }, [processedContent.html, processedContent.isEmpty]);

  if (processedContent.isEmpty) {
    return null;
  }

  return (
    <div ref={containerRef} className="message-content">
      {parsedContent}
    </div>
  );
};
