'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Wifi, WifiOff, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface RealtimeDebugProps {
  workspaceId?: string;
  channelId?: string;
  conversationId?: string;
  workspaceMemberId?: string;
  onForceReconnect?: () => void;
  connectionStatus?: string;
  isConnected?: boolean;
}

export const RealtimeDebug = ({
  workspaceId,
  channelId,
  conversationId,
  workspaceMemberId,
  onForceReconnect,
  connectionStatus = 'UNKNOWN',
  isConnected = false,
}: RealtimeDebugProps) => {
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>(
    'loading',
  );
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<string>('UNKNOWN');
  const [networkStatus, setNetworkStatus] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    // Check auth status
    const checkAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) {
          console.error('Auth error:', error);
          setAuthStatus('unauthenticated');
        } else if (session) {
          setAuthStatus('authenticated');
          setSessionInfo({
            userId: session.user.id,
            email: session.user.email,
            expiresAt: new Date(session.expires_at! * 1000).toISOString(),
            tokenLength: session.access_token.length,
          });
        } else {
          setAuthStatus('unauthenticated');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setAuthStatus('unauthenticated');
      }
    };

    checkAuth();

    // Monitor realtime connection status
    const checkRealtimeStatus = () => {
      const rt = supabase.realtime;
      setRealtimeStatus(rt.isConnected() ? 'CONNECTED' : 'DISCONNECTED');
    };

    checkRealtimeStatus();
    const interval = setInterval(checkRealtimeStatus, 1000);

    // Monitor network status
    const handleOnline = () => setNetworkStatus(true);
    const handleOffline = () => setNetworkStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getStatusIcon = (status: string, connected: boolean) => {
    if (!networkStatus) return <WifiOff className="h-4 w-4 text-red-500" />;
    if (connected) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === 'CONNECTING' || status === 'RECONNECTING')
      return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />;
    if (status === 'ERROR' || status === 'CHANNEL_ERROR')
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    return <Wifi className="h-4 w-4 text-gray-500" />;
  };

  const getStatusColor = (status: string, connected: boolean) => {
    if (!networkStatus) return 'destructive';
    if (connected) return 'default';
    if (status === 'CONNECTING' || status === 'RECONNECTING') return 'secondary';
    if (status === 'ERROR' || status === 'CHANNEL_ERROR') return 'destructive';
    return 'outline';
  };

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 bg-background/95 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Wifi className="h-4 w-4" />
          Realtime Debug
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {/* Network Status */}
        <div className="flex items-center justify-between">
          <span>Network:</span>
          <Badge variant={networkStatus ? 'default' : 'destructive'}>
            {networkStatus ? 'ONLINE' : 'OFFLINE'}
          </Badge>
        </div>

        {/* Auth Status */}
        <div className="flex items-center justify-between">
          <span>Auth:</span>
          <Badge variant={authStatus === 'authenticated' ? 'default' : 'destructive'}>
            {authStatus.toUpperCase()}
          </Badge>
        </div>

        {/* Realtime Status */}
        <div className="flex items-center justify-between">
          <span>Realtime:</span>
          <Badge variant={realtimeStatus === 'CONNECTED' ? 'default' : 'destructive'}>
            {realtimeStatus}
          </Badge>
        </div>

        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span>Connection:</span>
          <div className="flex items-center gap-1">
            {getStatusIcon(connectionStatus, isConnected)}
            <Badge variant={getStatusColor(connectionStatus, isConnected)}>
              {connectionStatus}
            </Badge>
          </div>
        </div>

        {/* Session Info */}
        {sessionInfo && (
          <div className="space-y-1 pt-2 border-t">
            <div className="text-xs text-muted-foreground">Session Info:</div>
            <div>User: {sessionInfo.email}</div>
            <div>Token: {sessionInfo.tokenLength} chars</div>
            <div>Expires: {new Date(sessionInfo.expiresAt).toLocaleTimeString()}</div>
          </div>
        )}

        {/* Channel Info */}
        <div className="space-y-1 pt-2 border-t">
          <div className="text-xs text-muted-foreground">Channels:</div>
          {workspaceId && <div>Workspace: {workspaceId.slice(0, 8)}...</div>}
          {channelId && <div>Channel: {channelId.slice(0, 8)}...</div>}
          {conversationId && <div>Conversation: {conversationId.slice(0, 8)}...</div>}
          {workspaceMemberId && <div>Member: {workspaceMemberId.slice(0, 8)}...</div>}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            size="sm"
            variant="outline"
            onClick={onForceReconnect}
            disabled={!onForceReconnect}
            className="flex-1"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Reconnect
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.location.reload()}
            className="flex-1"
          >
            Reload
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
