"use client";

import { useState, useEffect } from "react";
import { Volume2, VolumeX, Play } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { soundManager } from "@/features/notifications/lib/sound-manager";

export function NotificationSettings() {
  const [soundEnabled, setSoundEnabled] = useState(soundManager.getEnabled());
  const [volume, setVolume] = useState(soundManager.getVolume());
  const [loadedSounds, setLoadedSounds] = useState<string[]>([]);

  useEffect(() => {
    // Check which sounds are loaded
    const updateLoadedSounds = () => {
      setLoadedSounds(soundManager.getLoadedSounds());
    };

    updateLoadedSounds();

    // Check again after a short delay
    const timer = setTimeout(updateLoadedSounds, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabled(enabled);
    soundManager.setEnabled(enabled);
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    soundManager.setVolume(newVolume);
  };

  const testSound = (type: string) => {
    soundManager.forceInitialize(); // Ensure audio context is ready
    soundManager.playNotificationSound(type);
  };

  const soundTypes = [
    {
      type: "mention",
      label: "Mentions",
      description: "@username notifications",
    },
    {
      type: "direct_message",
      label: "Direct Messages",
      description: "Private conversations",
    },
    {
      type: "channel_message",
      label: "Channel Messages",
      description: "Public channel activity",
    },
    {
      type: "thread_reply",
      label: "Thread Replies",
      description: "Responses in threads",
    },
  ];

  return (
    <div className="space-y-6 p-4">
      <div>
        <h3 className="text-lg font-semibold mb-4">Notification Settings</h3>

        <div className="flex items-center justify-between mb-4">
          <div>
            <Label htmlFor="sound-enabled">Notification Sounds</Label>
            <p className="text-sm text-muted-foreground">
              Play sounds for new notifications
            </p>
          </div>
          <Switch
            id="sound-enabled"
            checked={soundEnabled}
            onCheckedChange={handleSoundToggle}
          />
        </div>

        {soundEnabled && (
          <div className="space-y-4">
            <div className="space-y-3">
              <Label>Volume</Label>
              <div className="flex items-center space-x-3">
                <VolumeX className="h-4 w-4" />
                <Slider
                  value={[volume]}
                  onValueChange={handleVolumeChange}
                  max={1}
                  min={0}
                  step={0.1}
                  className="flex-1"
                />
                <Volume2 className="h-4 w-4" />
              </div>
              <p className="text-xs text-muted-foreground">
                Volume: {Math.round(volume * 100)}%
              </p>
            </div>

            <div className="space-y-3">
              <Label>Test Notification Sounds</Label>
              <div className="grid grid-cols-1 gap-2">
                {soundTypes.map(({ type, label, description }) => (
                  <div
                    key={type}
                    className="flex items-center justify-between p-3 border rounded"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{label}</span>
                        <Badge
                          variant={
                            loadedSounds.includes(type)
                              ? "default"
                              : "secondary"
                          }
                        >
                          {loadedSounds.includes(type) ? "Loaded" : "Fallback"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {description}
                      </p>
                    </div>
                    <Button
                      onClick={() => testSound(type)}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <Play className="h-3 w-3" />
                      Test
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              <p>
                💡 Loaded sounds:{" "}
                {loadedSounds.length > 0
                  ? loadedSounds.join(", ")
                  : "Using fallback beeps"}
              </p>
              <p>
                🔊 If audio doesn't play immediately, try clicking anywhere on
                the page first
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
