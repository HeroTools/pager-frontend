import { Bell, Chrome, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useNotificationPermissions } from '@/features/notifications/hooks/use-notification-permissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface NotificationPreferences {
  soundEnabled: boolean;
  desktopEnabled: boolean;
  onlyMentions: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  soundEnabled: true,
  desktopEnabled: true,
  onlyMentions: false,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
};

export const NotificationSettings = () => {
  const { permission, requestPermission, isSupported } = useNotificationPermissions();
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem('notification_preferences');
    if (savedPreferences) {
      try {
        setPreferences(JSON.parse(savedPreferences));
      } catch (error) {
        console.error('Error loading notification preferences:', error);
      }
    }
  }, []);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('notification_preferences', JSON.stringify(preferences));
  }, [preferences]);

  const handleRequestPermission = async () => {
    setIsLoading(true);
    try {
      await requestPermission();
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreference = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K],
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const getPermissionBadge = () => {
    switch (permission) {
      case 'granted':
        return <Badge variant="default">Enabled</Badge>;
      case 'denied':
        return <Badge variant="destructive">Blocked</Badge>;
      case 'default':
        return <Badge variant="secondary">Not Set</Badge>;
      case 'unsupported':
        return <Badge variant="outline">Unsupported</Badge>;
    }
  };

  const getPermissionDescription = () => {
    switch (permission) {
      case 'granted':
        return "You'll receive desktop notifications for new messages.";
      case 'denied':
        return "Desktop notifications are blocked. You'll need to enable them in your browser settings.";
      case 'default':
        return "Enable desktop notifications to get alerts when you're not actively using the app.";
      case 'unsupported':
        return "Your browser doesn't support desktop notifications.";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Desktop Notifications
          </CardTitle>
          <CardDescription>Manage how you receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Permission Status */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label>Browser Permission</Label>
                  {getPermissionBadge()}
                </div>
                <p className="text-sm text-muted-foreground">{getPermissionDescription()}</p>
              </div>
              {permission === 'default' && isSupported && (
                <Button onClick={handleRequestPermission} disabled={isLoading} size="sm">
                  Enable
                </Button>
              )}
            </div>

            {permission === 'denied' && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium">How to enable notifications:</p>
                <ol className="mt-2 space-y-1 text-muted-foreground">
                  <li>
                    1. Click the <Chrome className="inline h-3 w-3" /> icon in your browser&apos;s
                    address bar
                  </li>
                  <li>2. Find &quot;Notifications&quot; in the site settings</li>
                  <li>3. Change from &quot;Block&quot; to &quot;Allow&quot;</li>
                  <li>4. Refresh this page</li>
                </ol>
              </div>
            )}
          </div>

          <Separator />

          {/* Notification Preferences */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Notification Preferences</h4>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="desktop-enabled">Desktop Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Show desktop notifications when you receive messages
                  </p>
                </div>
                <Switch
                  id="desktop-enabled"
                  checked={preferences.desktopEnabled && permission === 'granted'}
                  onCheckedChange={(checked) => updatePreference('desktopEnabled', checked)}
                  disabled={permission !== 'granted'}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sound-enabled">Notification Sounds</Label>
                  <p className="text-sm text-muted-foreground">
                    Play a sound when you receive notifications
                  </p>
                </div>
                <Switch
                  id="sound-enabled"
                  checked={preferences.soundEnabled}
                  onCheckedChange={(checked) => updatePreference('soundEnabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="only-mentions">Only Direct Messages & Mentions</Label>
                  <p className="text-sm text-muted-foreground">
                    Only notify for direct messages and @mentions
                  </p>
                </div>
                <Switch
                  id="only-mentions"
                  checked={preferences.onlyMentions}
                  onCheckedChange={(checked) => updatePreference('onlyMentions', checked)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Quiet Hours */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Quiet Hours</h4>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="quiet-hours">Enable Quiet Hours</Label>
                  <p className="text-sm text-muted-foreground">
                    Pause notifications during specific hours
                  </p>
                </div>
                <Switch
                  id="quiet-hours"
                  checked={preferences.quietHoursEnabled}
                  onCheckedChange={(checked) => updatePreference('quietHoursEnabled', checked)}
                />
              </div>

              {preferences.quietHoursEnabled && (
                <div className="grid grid-cols-2 gap-4 rounded-lg border p-3">
                  <div className="space-y-2">
                    <Label htmlFor="quiet-start">Start Time</Label>
                    <input
                      id="quiet-start"
                      type="time"
                      value={preferences.quietHoursStart}
                      onChange={(e) => updatePreference('quietHoursStart', e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quiet-end">End Time</Label>
                    <input
                      id="quiet-end"
                      type="time"
                      value={preferences.quietHoursEnd}
                      onChange={(e) => updatePreference('quietHoursEnd', e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Notification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Test Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => {
              if (permission === 'granted') {
                new Notification('Test Notification', {
                  body: 'This is what your notifications will look like!',
                  icon: '/favicon.ico',
                });
              }
            }}
            disabled={permission !== 'granted'}
            variant="outline"
            className="w-full"
          >
            Send Test Notification
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

// Export the notification preferences type and getter
export type { NotificationPreferences };

export const getNotificationPreferences = (): NotificationPreferences => {
  if (typeof window === 'undefined') {
    return DEFAULT_PREFERENCES;
  }

  const saved = localStorage.getItem('notification_preferences');
  if (!saved) {
    return DEFAULT_PREFERENCES;
  }

  try {
    return JSON.parse(saved);
  } catch {
    return DEFAULT_PREFERENCES;
  }
};
