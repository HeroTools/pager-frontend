import Quill from 'quill';

const Embed = Quill.import('blots/embed') as any;

interface MentionValue {
  id: string; // workspace_member_id
  name?: string;
  isCurrentUser?: boolean; // Flag to indicate if this is the current user
}

class MentionBlot extends Embed {
  static blotName = 'mention';
  static tagName = 'span';
  static className = 'mention';

  // This ensures the value is properly included when getContents() is called
  static value(node: HTMLSpanElement): any {
    return {
      id: node.getAttribute('data-member-id') || '',
    };
  }

  static create(value: MentionValue) {
    const node = super.create(value) as HTMLSpanElement;
    node.setAttribute('data-member-id', value.id);
    node.setAttribute('contenteditable', 'false');
    node.textContent = `@${value.name || value.id}`;

    // Techy minimalist styling: subtle backgrounds with good contrast
    const baseClasses = 'mention inline-block px-1 py-0 rounded text-sm cursor-pointer transition-colors mx-0.5';
    
    if (value.isCurrentUser) {
      // Subtle blue background with dark text for self-mentions
      node.className = `${baseClasses} bg-green-500/20 text-green-500 hover:bg-green-500/40`;
    } else {
      // Very subtle gray background with normal text for other mentions
      node.className = `${baseClasses} bg-blue-500/20 text-blue-500 hover:bg-blue-500/40`;
    }

    node.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      node.dispatchEvent(
        new CustomEvent('mentionClick', {
          detail: { memberId: value.id },
          bubbles: true,
        }),
      );
    });

    return node;
  }
}

export default MentionBlot;
