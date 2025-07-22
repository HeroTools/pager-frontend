import Quill from 'quill';

const Embed = Quill.import('blots/embed') as any;

interface MentionValue {
  id: string;
  name: string;
  userId: string;
}

class MentionBlot extends Embed {
  static blotName = 'mention';
  static tagName = 'span';
  static className = 'mention';

  static create(value: MentionValue) {
    const node = super.create(value) as HTMLSpanElement;
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
    
    // Add click handler
    node.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Dispatch custom event for mention click
      const event = new CustomEvent('mentionClick', {
        detail: {
          memberId: value.id,
          userId: value.userId,
          name: value.name
        }
      });
      
      // Find the editor container and dispatch the event
      let parent = node.parentElement;
      while (parent && !parent.classList.contains('ql-editor')) {
        parent = parent.parentElement;
      }
      if (parent) {
        parent.dispatchEvent(event);
      }
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

  static value(node: HTMLSpanElement): MentionValue {
    return {
      id: node.getAttribute('data-member-id') || '',
      userId: node.getAttribute('data-user-id') || '',
      name: node.getAttribute('data-name') || ''
    };
  }
}

export default MentionBlot;