'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Lock, Globe, Calendar } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useMultiUserConversations } from '../hooks/use-agents';
import { useJoinConversation } from '../hooks/use-agents-mutations';
import { useParamIds } from '@/hooks/use-param-ids';
import type { MultiUserConversationListItem } from '../types';

interface MultiUserConversationsListProps {
  showPrivate?: boolean;
}

export const MultiUserConversationsList = ({ 
  showPrivate = false 
}: MultiUserConversationsListProps) => {
  const { workspaceId } = useParamIds();
  const router = useRouter();
  const [joiningIds, setJoiningIds] = useState<Set<string>>(new Set());

  const { data, isLoading, error } = useMultiUserConversations(workspaceId, {
    includePrivate: showPrivate,
    limit: 20,
  });

  const joinConversation = useJoinConversation(workspaceId);

  const handleJoinConversation = async (conversation: MultiUserConversationListItem) => {
    if (conversation.is_member) {
      // Already a member, navigate directly
      router.push(`/${workspaceId}/agents/${conversation.agent.id}/${conversation.conversation.id}`);
      return;
    }

    setJoiningIds(prev => new Set(prev).add(conversation.conversation.id));

    try {
      await joinConversation.mutateAsync({
        conversationId: conversation.conversation.id,
      });
      
      // Navigate to the conversation
      router.push(`/${workspaceId}/agents/${conversation.agent.id}/${conversation.conversation.id}`);
    } catch (error) {
      console.error('Failed to join conversation:', error);
    } finally {
      setJoiningIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(conversation.conversation.id);
        return newSet;
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="h-16 bg-muted rounded mb-3" />
              <div className="h-8 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Failed to load conversations</p>
      </div>
    );
  }

  if (!data?.conversations.length) {
    return (
      <div className="text-center py-12">
        <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No multi-user conversations yet</h3>
        <p className="text-muted-foreground mb-4">
          Create the first multi-user agent conversation to collaborate with your team.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.conversations.map((item) => (
        <Card key={item.conversation.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base truncate">
                  {item.conversation.title}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={item.agent.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {item.agent.name[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground truncate">
                    {item.agent.name}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {item.conversation.is_public ? (
                  <Globe className="h-4 w-4 text-green-600" />
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
                {item.is_member && (
                  <Badge variant="secondary" className="text-xs">
                    Member
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            {item.conversation.description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {item.conversation.description}
              </p>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{item.member_count} members</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(item.conversation.created_at)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={item.creator.image || undefined} />
                  <AvatarFallback className="text-xs">
                    {item.creator.name[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">
                  by {item.creator.name}
                </span>
              </div>

              <Button
                size="sm"
                variant={item.is_member ? "outline" : "default"}
                onClick={() => handleJoinConversation(item)}
                disabled={joiningIds.has(item.conversation.id)}
              >
                {joiningIds.has(item.conversation.id) 
                  ? 'Joining...' 
                  : item.is_member 
                    ? 'Open' 
                    : 'Join'
                }
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};