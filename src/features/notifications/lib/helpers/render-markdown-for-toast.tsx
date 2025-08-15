import DOMPurify from 'dompurify';
import { JSX } from 'react';

const parseMarkdown = (text: string): string => {
  const html = text
    // Bold **text**
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Italic *text*
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Links
    .replace(
      /<(https?:\/\/[^|>]+)\|([^>]+)>/g,
      '<a href="$1" class="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">$2</a>',
    )
    // Plain URLs
    .replace(
      /<(https?:\/\/[^>]+)>/g,
      '<a href="$1" class="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>',
    )
    // Code `text`
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded text-sm">$1</code>');

  return DOMPurify.sanitize(html);
};

const renderMarkdownForToast = (text: string): JSX.Element => {
  return <div dangerouslySetInnerHTML={{ __html: parseMarkdown(text) }} />;
};

export { parseMarkdown, renderMarkdownForToast };
