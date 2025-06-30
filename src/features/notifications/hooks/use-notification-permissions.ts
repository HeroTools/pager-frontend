"use client";

import { useState, useEffect } from "react";

export function useNotificationPermissions() {
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [canPlaySounds, setCanPlaySounds] = useState(false);

  useEffect(() => {
    // Check current notification permission
    if (window && "Notification" in window) {
      setPermission(Notification.permission);
    }

    // Check if audio can be played (for autoplay restrictions)
    const testAudio = () => {
      const audio = new Audio();
      const canPlay = audio.play();

      if (canPlay !== undefined) {
        canPlay
          .then(() => {
            setCanPlaySounds(true);
            audio.pause();
            audio.currentTime = 0;
          })
          .catch(() => {
            setCanPlaySounds(false);
          });
      }
    };

    // Test after user interaction
    document.addEventListener("click", testAudio, { once: true });

    return () => {
      document.removeEventListener("click", testAudio);
    };
  }, []);

  const requestPermission = async () => {
    if (window && "Notification" in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    }
    return "denied";
  };

  return {
    permission,
    canPlaySounds,
    requestPermission,
    isSupported: window && "Notification" in window,
  };
}
