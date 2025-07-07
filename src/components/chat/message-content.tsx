'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import parse, {
  domToReact,
  HTMLReactParserOptions,
  Element as HtmlElement,
  DOMNode,
} from 'html-react-parser';
import { QuillDeltaToHtmlConverter } from 'quill-delta-to-html';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
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

interface MessageContentProps {
  content: string;
}

export const MessageContent = ({ content }: MessageContentProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });

  const cleanHtml = useMemo((): string => {
    let delta: QuillDelta;
    try {
      delta = JSON.parse(content) as QuillDelta;
    } catch {
      const hasBlockElements = /<(p|div|h[1-6]|ul|ol|li|blockquote|pre|table|tr|td|th)[^>]*>/i.test(
        content,
      );

      if (hasBlockElements) {
        return DOMPurify.sanitize(content);
      } else {
        return DOMPurify.sanitize(`<p>${content}</p>`);
      }
    }

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
    return DOMPurify.sanitize(dirty);
  }, [content]);

  const parsedContent = useMemo(() => {
    const options: HTMLReactParserOptions = {
      replace: (node) => {
        if (node.type === 'tag' && (node as HtmlElement).name === 'a') {
          const el = node as HtmlElement;
          const href = el.attribs.href || el.attribs.src || '';
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
    if (!containerRef.current) return;
    containerRef.current
      .querySelectorAll('pre code')
      .forEach((block) => hljs.highlightElement(block as HTMLElement));
  }, [parsedContent]);

  return (
    <div ref={containerRef} className="message-content">
      {parsedContent}
    </div>
  );
};
