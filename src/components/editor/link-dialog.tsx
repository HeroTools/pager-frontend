import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (text: string, url: string) => void;
  selectedText?: string;
  initialUrl?: string;
}

export const LinkDialog = ({ 
  isOpen, 
  onClose, 
  onSave, 
  selectedText = '', 
  initialUrl = '' 
}: LinkDialogProps) => {
  const [text, setText] = useState(selectedText);
  const [url, setUrl] = useState(initialUrl);

  // Update text when selectedText changes
  useEffect(() => {
    setText(selectedText);
  }, [selectedText]);

  const handleSave = () => {
    if (!url.trim()) return;
    onSave(text.trim() || url.trim(), url.trim());
    handleClose();
  };

  const handleClose = () => {
    setText('');
    setUrl('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add link</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="link-text">Text</Label>
            <Input
              id="link-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Link text"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="link-url">Link</Label>
            <Input
              id="link-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              type="url"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!url.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 