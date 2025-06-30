class NotificationSoundManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private isEnabled: boolean = true;
  private volume: number = 0.7;
  private isInitialized: boolean = false;
  private audioContext: AudioContext | null = null;
  private isAudioContextReady: boolean = false;
  private pendingSounds: string[] = [];

  constructor() {
    if (typeof window !== "undefined") {
      this.init();
    }
  }

  private async init() {
    try {
      await this.loadSounds();
      this.loadPreferences();
      this.setupUserInteractionListener();
      this.isInitialized = true;
    } catch (error) {
      console.warn("Failed to initialize sound manager:", error);
    }
  }

  private setupUserInteractionListener() {
    if (typeof document === "undefined") return;

    const initAudioContext = () => {
      this.initializeAudioContext();

      // Remove listeners once initialized
      document.removeEventListener("click", initAudioContext);
      document.removeEventListener("keydown", initAudioContext);
      document.removeEventListener("touchstart", initAudioContext);
    };

    // Listen for any user interaction to initialize AudioContext
    document.addEventListener("click", initAudioContext, { once: true });
    document.addEventListener("keydown", initAudioContext, { once: true });
    document.addEventListener("touchstart", initAudioContext, { once: true });
  }

  private initializeAudioContext() {
    if (this.isAudioContextReady || typeof AudioContext === "undefined") return;

    try {
      this.audioContext = new AudioContext();
      this.isAudioContextReady = true;

      console.log("🎵 AudioContext initialized after user interaction");

      // Play any pending sounds
      this.pendingSounds.forEach((type) => this.playNotificationSound(type));
      this.pendingSounds = [];
    } catch (error) {
      console.warn("Failed to initialize AudioContext:", error);
    }
  }

  private async loadSounds() {
    if (typeof Audio === "undefined") return;

    const soundFiles = {
      mention: "/sounds/mention.mp3", // Higher pitch for mentions
      direct_message: "/sounds/message.mp3", // Standard message sound
      channel_message: "/sounds/channel.mp3", // Softer for channel messages
      thread_reply: "/sounds/thread.mp3", // Different tone for threads
    };

    const loadPromises = Object.entries(soundFiles).map(([type, url]) => {
      return new Promise<void>((resolve) => {
        const audio = new Audio(url);
        audio.volume = this.volume;
        audio.preload = "auto";

        const onCanPlayThrough = () => {
          this.sounds.set(type, audio);
          console.log(`✅ Loaded sound: ${type}`);
          cleanup();
          resolve();
        };

        const onError = () => {
          console.warn(`⚠️ Failed to load sound: ${url}, will use fallback`);
          cleanup();
          resolve(); // Still resolve to not block initialization
        };

        const cleanup = () => {
          audio.removeEventListener("canplaythrough", onCanPlayThrough);
          audio.removeEventListener("error", onError);
        };

        audio.addEventListener("canplaythrough", onCanPlayThrough, {
          once: true,
        });
        audio.addEventListener("error", onError, { once: true });

        // Fallback timeout
        setTimeout(() => {
          cleanup();
          resolve();
        }, 3000);
      });
    });

    await Promise.all(loadPromises);
    console.log(
      `🎵 Sound loading complete. Loaded ${this.sounds.size} sound files.`
    );
  }

  private loadPreferences() {
    if (typeof localStorage === "undefined") return;

    try {
      const enabled = localStorage.getItem("notifications-sound-enabled");
      const volume = localStorage.getItem("notifications-sound-volume");

      this.isEnabled = enabled !== "false";
      this.volume = volume ? parseFloat(volume) : 0.7;

      console.log(
        `🎛️ Sound preferences loaded: enabled=${this.isEnabled}, volume=${this.volume}`
      );
    } catch (error) {
      console.warn("Failed to load sound preferences:", error);
    }
  }

  async playNotificationSound(type: string): Promise<void> {
    if (!this.isEnabled) {
      console.log("🔇 Sound disabled by user preference");
      return;
    }

    if (!this.isInitialized) {
      console.log("⏳ Sound manager not initialized yet");
      return;
    }

    console.log(`🔊 Playing notification sound: ${type}`);

    // Try to play actual sound file first
    const success = await this.tryPlaySoundFile(type);

    if (!success) {
      // Fallback to generated beep
      await this.playSystemBeep();
    }
  }

  private async tryPlaySoundFile(type: string): Promise<boolean> {
    try {
      const sound = this.sounds.get(type) || this.sounds.get("direct_message");

      if (sound) {
        // Clone the audio to allow multiple simultaneous plays
        const audioClone = sound.cloneNode() as HTMLAudioElement;
        audioClone.volume = this.volume;
        audioClone.currentTime = 0;

        await audioClone.play();
        console.log(`✅ Sound file played successfully: ${type}`);
        return true;
      } else {
        console.log(`⚠️ Sound file not found: ${type}, using fallback`);
        return false;
      }
    } catch (error) {
      console.warn(`❌ Sound file playback failed for ${type}:`, error);
      return false;
    }
  }

  private async playSystemBeep(): Promise<void> {
    const playBeep = () => {
      if (!this.audioContext || this.audioContext.state !== "running") {
        console.warn("⚠️ AudioContext not ready for beep");
        return;
      }

      try {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
        gainNode.gain.setValueAtTime(
          this.volume * 0.1,
          this.audioContext.currentTime
        );
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          this.audioContext.currentTime + 0.1
        );

        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.1);

        console.log("✅ System beep played successfully");
      } catch (error) {
        console.warn("❌ System beep failed:", error);
      }
    };

    if (this.isAudioContextReady && this.audioContext) {
      // AudioContext is ready, play immediately
      playBeep();
    } else {
      // Queue beep for after user interaction
      console.log("⏳ Queueing beep for after user interaction...");
      if (!this.pendingSounds.includes("beep")) {
        this.pendingSounds.push("beep");
      }

      // Try immediate fallback
      this.tryImmediateBeep();
    }
  }

  private tryImmediateBeep() {
    try {
      // Try without storing AudioContext (sometimes works)
      const tempAudioContext = new AudioContext();
      const oscillator = tempAudioContext.createOscillator();
      const gainNode = tempAudioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(tempAudioContext.destination);

      oscillator.frequency.setValueAtTime(800, tempAudioContext.currentTime);
      gainNode.gain.setValueAtTime(
        this.volume * 0.1,
        tempAudioContext.currentTime
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        tempAudioContext.currentTime + 0.1
      );

      oscillator.start();
      oscillator.stop(tempAudioContext.currentTime + 0.1);

      console.log("✅ Immediate beep played (despite AudioContext warning)");
    } catch (error) {
      console.warn("❌ Immediate beep also failed:", error);
    }
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("notifications-sound-enabled", String(enabled));
    }
    console.log(`🎛️ Sound enabled: ${enabled}`);
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("notifications-sound-volume", String(this.volume));
    }

    // Update all sound volumes
    this.sounds.forEach((sound) => {
      sound.volume = this.volume;
    });

    console.log(`🎛️ Volume set to: ${this.volume}`);
  }

  getEnabled(): boolean {
    return this.isEnabled;
  }

  getVolume(): number {
    return this.volume;
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  // Force initialization (call from user interaction)
  forceInitialize() {
    if (!this.isAudioContextReady) {
      this.initializeAudioContext();
    }
  }

  // Get loading status
  getLoadedSounds(): string[] {
    return Array.from(this.sounds.keys());
  }
}

// Create singleton instance
let soundManagerInstance: NotificationSoundManager | null = null;

export const getSoundManager = (): NotificationSoundManager => {
  if (!soundManagerInstance && typeof window !== "undefined") {
    soundManagerInstance = new NotificationSoundManager();
  }
  return soundManagerInstance as NotificationSoundManager;
};

// For backwards compatibility
export const soundManager = {
  playNotificationSound: async (type: string) => {
    const manager = getSoundManager();
    if (manager) {
      await manager.playNotificationSound(type);
    }
  },
  setEnabled: (enabled: boolean) => {
    const manager = getSoundManager();
    if (manager) {
      manager.setEnabled(enabled);
    }
  },
  setVolume: (volume: number) => {
    const manager = getSoundManager();
    if (manager) {
      manager.setVolume(volume);
    }
  },
  getEnabled: (): boolean => {
    const manager = getSoundManager();
    return manager ? manager.getEnabled() : true;
  },
  getVolume: (): number => {
    const manager = getSoundManager();
    return manager ? manager.getVolume() : 0.7;
  },
  forceInitialize: () => {
    const manager = getSoundManager();
    if (manager) {
      manager.forceInitialize();
    }
  },
  getLoadedSounds: (): string[] => {
    const manager = getSoundManager();
    return manager ? manager.getLoadedSounds() : [];
  },
};
