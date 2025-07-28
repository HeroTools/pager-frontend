'use client';

import { Bot, Code, FileText, Search, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import type { UploadedAttachment } from '@/features/file-upload/types';
import { useParamIds } from '@/hooks/use-param-ids';
import { useUIStore } from '@/stores/ui-store';

const Editor = dynamic(() => import('@/components/editor/editor'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col border rounded-md overflow-hidden">
      <div className="h-30 p-4">
        <Skeleton className="h-full w-full rounded-md" />
      </div>
      <div className="flex px-2 pb-2 gap-2 border-t">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-8 w-20 rounded ml-auto" />
      </div>
    </div>
  ),
});

interface AiAssistantPanelProps {
  channel?: {
    id: string;
    name: string;
    isPrivate?: boolean;
  };
  conversationData?: any;
  chatType?: 'conversation' | 'channel';
  onClose?: () => void;
}

export const AiAssistantPanel: React.FC<AiAssistantPanelProps> = ({
  channel,
  conversationData,
  chatType = 'channel',
  onClose,
}) => {
  const { setAiAssistantPanelOpen } = useUIStore();
  const [isLoading, setIsLoading] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const { workspaceId, id: entityId, type } = useParamIds();
  const { user: currentUser } = useCurrentUser(workspaceId);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setAiAssistantPanelOpen(false);
    }
  };

  const handleSubmit = async (content: {
    body: string;
    attachments: UploadedAttachment[];
    plainText: string;
  }) => {
    if (isLoading || !currentUser) return;

    setIsLoading(true);
    // TODO: Implement AI assistant API call
    console.log('Sending message to AI:', content);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setEditorKey((prev) => prev + 1); // Reset editor
    }, 1000);
  };

  const handleQuickAction = (action: string) => {
    // For quick actions, we could pre-fill the editor or send directly
    console.log('Quick action:', action);
  };

  const getContextText = () => {
    if (chatType === 'conversation') {
      return 'Direct message conversation';
    }
    return `#${channel?.name || 'channel'} channel discussion`;
  };

  const quickActions = [
    {
      icon: <Code className="w-4 h-4" />,
      text: 'Debug this 400 error',
      description: 'Help troubleshoot the authentication issue',
    },
    {
      icon: <Search className="w-4 h-4" />,
      text: 'Look up Supabase RPC docs',
      description: 'Find documentation for database functions',
    },
    {
      icon: <FileText className="w-4 h-4" />,
      text: 'Explain user creation flow',
      description: 'Break down the signup process',
    },
  ];

  return (
    <div className="flex flex-col h-full bg-card border-l border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-brand-blue" />
          <h2 className="font-semibold text-foreground">AI Assistant</h2>
        </div>
        <Button
          onClick={handleClose}
          variant="ghost"
          size="iconSm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Context */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">Context:</h3>
            <p className="text-sm text-muted-foreground">{getContextText()}</p>
          </div>

          {/* Conversation Summary */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Conversation Summary</h3>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Discussion about Supabase RPC functions and a 400 error during user creation. Gabe
                is experiencing signup issues.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  onClick={() => handleQuickAction(action.text)}
                  variant="ghost"
                  className="w-full justify-start h-auto p-3 bg-muted/30 hover:bg-muted/50 text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-brand-blue mt-0.5">{action.icon}</div>
                    <div>
                      <div className="font-medium text-sm text-foreground">{action.text}</div>
                      <div className="text-xs text-muted-foreground mt-1">{action.description}</div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Claude Response */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Avatar className="w-6 h-6">
                <AvatarImage src="/claude-avatar.png" alt="Claude" />
                <AvatarFallback className="bg-brand-blue text-white text-xs">
                  <Bot className="w-3 h-3" />
                </AvatarFallback>
              </Avatar>
              <h3 className="text-sm font-medium text-foreground">Claude</h3>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <p className="text-sm text-foreground leading-relaxed">
                I can help debug the 400 error. It looks like there&apos;s an issue with user
                creation in your Supabase setup. Would you like me to:
              </p>
              <ul className="text-sm text-foreground space-y-1 ml-4">
                <li>• Check common Supabase auth issues</li>
                <li>• Review your RPC function</li>
                <li>• Examine database permissions</li>
              </ul>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Chat Input */}
      <div className="px-4 py-4 border-t border bg-background">
        {currentUser ? (
          <Editor
            variant="create"
            workspaceId={workspaceId}
            onSubmit={handleSubmit}
            placeholder={isLoading ? 'AI is thinking...' : 'Ask AI about this conversation...'}
            key={editorKey}
            maxFiles={5}
            maxFileSizeBytes={10 * 1024 * 1024}
            userId={currentUser.id}
            channelId={type === 'channel' ? entityId : undefined}
            conversationId={type === 'conversation' ? entityId : undefined}
          />
        ) : (
          <div className="flex items-center justify-center h-30 text-sm text-muted-foreground">
            Loading user information...
          </div>
        )}
      </div>
    </div>
  );
};
