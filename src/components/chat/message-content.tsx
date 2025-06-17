import React from "react";
import { Delta } from "quill/core";

interface MessageContentProps {
  content: string;
}

export const MessageContent: React.FC<MessageContentProps> = ({ content }) => {
  // Parse Quill Delta content
  const parseContent = (content: string) => {
    try {
      const delta = JSON.parse(content) as Delta;
      return delta.ops?.map((op, index) => {
        if (typeof op.insert === "string") {
          let text = op.insert;
          const attributes = op.attributes || {};

          if (attributes.bold) {
            text = `<strong>${text}</strong>`;
          }
          if (attributes.italic) {
            text = `<em>${text}</em>`;
          }
          if (attributes.strike) {
            text = `<s>${text}</s>`;
          }
          if (attributes.link) {
            text = `<a href="${attributes.link}" class="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">${text}</a>`;
          }

          return (
            <span key={index} dangerouslySetInnerHTML={{ __html: text }} />
          );
        }
        return null;
      });
    } catch {
      // Fallback to plain text if parsing fails
      return content;
    }
  };

  return (
    <div className="text-gray-900 leading-relaxed whitespace-pre-wrap break-words">
      {parseContent(content)}
    </div>
  );
};
