import Quill from 'quill';

const Embed = Quill.import('blots/embed') as any;

interface MentionValue {
  id: string; // workspace_member_id
  name?: string; 
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
    // Use name if available, otherwise show ID as placeholder
    node.textContent = value.name ? `@${value.name}` : `@${value.id}`;

    // Use Tailwind classes for styling
    node.className =
      'mention inline-block bg-blue-500 text-white px-1.5 py-0.5 rounded text-sm cursor-pointer hover:bg-blue-600 transition-colors mx-0.5';

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
