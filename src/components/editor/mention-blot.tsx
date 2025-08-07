import Quill from 'quill';

const Embed = Quill.import('blots/embed') as any;

interface MentionValue {
  id: string; // workspace_member_id
  name: string;
  userId: string;
}

class MentionBlot extends Embed {
  static blotName = 'mention';
  static tagName = 'span';
  static className = 'mention';

  // This ensures the value is properly included when getContents() is called
  static value(node: HTMLSpanElement): any {
    return {
      id: node.getAttribute('data-member-id') || '',
      userId: node.getAttribute('data-user-id') || '',
      name: node.getAttribute('data-name') || '',
    };
  }

  static create(value: MentionValue) {
    const node = super.create(value) as HTMLSpanElement;
    // Store the actual mention format that will be saved to the database
    node.setAttribute('data-mention', `<@${value.id}>`);
    node.setAttribute('data-member-id', value.id);
    node.setAttribute('data-user-id', value.userId);
    node.setAttribute('data-name', value.name);
    node.textContent = `@${value.name}`;
    node.style.backgroundColor = '#3b82f6';
    node.style.color = 'white';
    node.style.padding = '2px 6px';
    node.style.borderRadius = '4px';
    node.style.fontSize = '14px';
    node.style.cursor = 'pointer';
    node.style.display = 'inline-block';
    node.style.margin = '0 2px';

    // Add click handler to open profile panel
    node.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Dispatch custom event for mention click with workspace_member_id
      const event = new CustomEvent('mentionClick', {
        detail: {
          memberId: value.id, // This is the workspace_member_id
          userId: value.userId,
          name: value.name,
        },
        bubbles: true,
      });

      // Dispatch the event from the node itself, it will bubble up
      node.dispatchEvent(event);
    });

    // Add hover effects
    node.addEventListener('mouseenter', () => {
      node.style.backgroundColor = '#2563eb';
    });

    node.addEventListener('mouseleave', () => {
      node.style.backgroundColor = '#3b82f6';
    });

    return node;
  }
}

export default MentionBlot;
