'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Plus, Users, MessageSquare, Hash } from 'lucide-react';

import { SkeletonMessages } from '@/components/chat/skeleton-messages';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AgentConversationChat from '@/features/agents/components/agent-conversation-chat';
import { CreateMultiUserConversationModal } from '@/features/agents/components/create-multi-user-conversation-modal';
import { JoinConversationModal } from '@/features/agents/components/join-conversation-modal';
import { MultiUserConversationsList } from '@/features/agents/components/multi-user-conversations-list';
import { useAgents, useAgentConversations } from '@/features/agents/hooks/use-agents';
import { useParamIds } from '@/hooks/use-param-ids';

export default function AgentConversationPage() {
  const { workspaceId, agentId } = useParamIds();
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const { data: agentData, isLoading: isLoadingAgent } = useAgents(workspaceId);
  const { data, isLoading: isLoadingConversation } = useAgentConversations(workspaceId, agentId);

  const agent = agentData?.find(a => a.id === agentId);
  const conversationId = data?.conversation?.id;

  useEffect(() => {
    if (conversationId) {
      router.replace(`/${workspaceId}/agents/${agentId}/${conversationId}`);
    }
  }, [conversationId, router, workspaceId, agentId]);

  // If we have a direct conversation, show it immediately
  if (conversationId) {
    if (isLoadingConversation) {
      return (
        <div className="flex flex-col h-full">
          <div className="flex-1 bg-chat">
            <div className="px-4 py-4 space-y-2">
              <SkeletonMessages count={15} />
            </div>
          </div>
        </div>
      );
    }
    return <AgentConversationChat agentId={agentId} conversationId={conversationId} />;
  }

  if (isLoadingAgent) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 bg-chat">
          <div className="px-4 py-4 space-y-2">
            <SkeletonMessages count={15} />
          </div>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Agent not found</p>
      </div>
    );
  }

  const handleStartDirectChat = () => {
    // Navigate to direct chat (will create conversation automatically)
    router.push(`/${workspaceId}/agents/${agentId}/new`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Hash className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="font-semibold text-lg">{agent.name}</h1>
            <p className="text-sm text-muted-foreground">
              {agent.description || 'AI Assistant'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <Tabs defaultValue="start" className="w-full max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="start">Get Started</TabsTrigger>
            <TabsTrigger value="multi-user">Multi-User Conversations</TabsTrigger>
          </TabsList>
          
          <TabsContent value="start" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Direct Chat */}
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleStartDirectChat}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Direct Chat
                  </CardTitle>
                  <CardDescription>
                    Start a private conversation with {agent.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">
                    Start Chatting
                  </Button>
                </CardContent>
              </Card>

              {/* Multi-User Chat */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Multi-User Chat
                  </CardTitle>
                  <CardDescription>
                    Create or join a conversation where multiple people can chat with {agent.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full" 
                    onClick={() => setShowCreateModal(true)}
                    variant="outline"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Group Chat
                  </Button>
                  <Button 
                    className="w-full" 
                    onClick={() => setShowJoinModal(true)}
                    variant="outline"
                  >
                    Join with Code
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="multi-user" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Multi-User Conversations</h2>
                <div className="flex gap-2">
                  <Button onClick={() => setShowJoinModal(true)} variant="outline" size="sm">
                    Join with Code
                  </Button>
                  <Button onClick={() => setShowCreateModal(true)} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Create
                  </Button>
                </div>
              </div>
              <MultiUserConversationsList showPrivate={true} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <CreateMultiUserConversationModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />
      <JoinConversationModal 
        isOpen={showJoinModal} 
        onClose={() => setShowJoinModal(false)} 
      />
    </div>
  );
}
