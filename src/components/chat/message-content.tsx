'use client';

import { Hint } from '@/components/hint';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import parse, {
  DOMNode,
  domToReact,
  Element as HtmlElement,
  HTMLReactParserOptions,
} from 'html-react-parser';
import { QuillDeltaToHtmlConverter } from 'quill-delta-to-html';
import React, { useEffect, useMemo, useRef } from 'react';

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

const isContentEmpty = (html: string): boolean => {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent?.trim().length === 0;
};

const isDeltaEmpty = (delta: QuillDelta): boolean =>
  !delta.ops ||
  delta.ops.every((op) => (typeof op.insert === 'string' ? op.insert.trim().length === 0 : true));

export const MessageContent = ({ content }: { content: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });

  // sanitize + convert quill-delta or raw HTML → cleanHtml
  const cleanHtml = useMemo<string>(() => {
    if (!content.trim()) return '';

    try {
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
    } catch {
      // not JSON → treat as HTML
      const wrapped = /<(p|div|h[1-6]|ul|ol|li|blockquote|pre|table)[^>]*>/i.test(content)
        ? content
        : `<p>${content}</p>`;
      const sanitized = DOMPurify.sanitize(wrapped);
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

  // syntax-highlight any code blocks
  useEffect(() => {
    if (!cleanHtml) return;
    containerRef.current
      ?.querySelectorAll('pre code')
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
