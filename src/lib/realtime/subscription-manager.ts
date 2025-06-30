import { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

interface ChannelInfo {
  channel: RealtimeChannel;
  handlers: Map<string, Set<(payload: any) => void>>;
  refCount: number;
  currentStatus: string;
  lastActivity: number;
  reconnectAttempts: number;
  lastReconnectTime: number;
  isReconnecting: boolean;
  circuitBreakerOpen: boolean;
  circuitBreakerOpenTime: number;
}

interface ConnectionHealth {
  isHealthy: boolean;
  lastPingTime: number;
  lastPongTime: number;
  consecutiveFailures: number;
}

export class SubscriptionManager {
  private static instance: SubscriptionManager;
  private client: SupabaseClient;
  private channels: Map<string, ChannelInfo>;
  private statusListeners: Map<string, Set<(status: string) => void>>;
  private cleanupTimers: Map<string, NodeJS.Timeout>;
  private keepAliveChannel: RealtimeChannel | null = null;
  private connectionHealth: ConnectionHealth;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isTabVisible: boolean = true;
  private isOnline: boolean = true;
  private globalCircuitBreakerOpen: boolean = false;
  private globalCircuitBreakerOpenTime: number = 0;
  private instanceId: string;
  private lastVisibilityChange: number = 0;
  private pendingReconnectTimeout: NodeJS.Timeout | null = null;

  private readonly CLEANUP_DELAY = 1000;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // Increased to 30s
  private readonly MAX_RECONNECT_ATTEMPTS = 3; // Reduced from 5
  private readonly RECONNECT_DELAY_BASE = 2000; // Increased base delay
  private readonly MAX_RECONNECT_DELAY = 30000;
  private readonly CONNECTION_TIMEOUT = 15000;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute
  private readonly MIN_RECONNECT_INTERVAL = 5000; // Minimum time between reconnect attempts
  private readonly MAX_CONSECUTIVE_FAILURES = 5;

  private constructor(client: SupabaseClient) {
    this.client = client;
    this.channels = new Map();
    this.statusListeners = new Map();
    this.cleanupTimers = new Map();
    this.instanceId = `sm_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    this.connectionHealth = {
      isHealthy: true,
      lastPingTime: Date.now(),
      lastPongTime: Date.now(),
      consecutiveFailures: 0,
    };

    console.log(`SubscriptionManager instance created: ${this.instanceId}`);
    this.setupEventListeners();
    this.createKeepAliveChannel();
    this.startHealthChecking();
  }

  private setupEventListeners(): void {
    if (typeof window === "undefined") return;

    document.addEventListener(
      "visibilitychange",
      this.handleVisibilityChange.bind(this)
    );
    window.addEventListener("focus", this.handleWindowFocus.bind(this));
    window.addEventListener("online", this.handleOnline.bind(this));
    window.addEventListener("offline", this.handleOffline.bind(this));
  }

  private handleVisibilityChange(): void {
    const wasVisible = this.isTabVisible;
    this.isTabVisible = !document.hidden;
    this.lastVisibilityChange = Date.now();

    console.log(
      `[${this.instanceId}] Visibility changed: ${wasVisible} -> ${this.isTabVisible}`
    );

    // Clear any pending reconnection attempts
    if (this.pendingReconnectTimeout) {
      clearTimeout(this.pendingReconnectTimeout);
      this.pendingReconnectTimeout = null;
    }

    // Only attempt reconnection if tab becomes visible, we're online, AND connections are actually broken
    if (!wasVisible && this.isTabVisible && this.isOnline) {
      // Use longer delay and debouncing to prevent rapid reconnection attempts
      this.pendingReconnectTimeout = setTimeout(() => {
        // Double-check visibility hasn't changed again
        if (
          this.isTabVisible &&
          Date.now() - this.lastVisibilityChange > 4000
        ) {
          this.checkConnectionHealthBeforeReconnect();
        }
        this.pendingReconnectTimeout = null;
      }, 5000);
    }
  }

  private handleWindowFocus(): void {
    console.log(`[${this.instanceId}] Window focused`);

    if (this.isTabVisible && this.isOnline) {
      // Clear any existing pending reconnect
      if (this.pendingReconnectTimeout) {
        clearTimeout(this.pendingReconnectTimeout);
        this.pendingReconnectTimeout = null;
      }

      this.pendingReconnectTimeout = setTimeout(() => {
        if (this.isTabVisible) {
          this.checkConnectionHealthBeforeReconnect();
        }
        this.pendingReconnectTimeout = null;
      }, 3000);
    }
  }

  private handleOnline(): void {
    this.isOnline = true;
    this.connectionHealth.consecutiveFailures = 0;
    this.globalCircuitBreakerOpen = false;

    // Reset circuit breakers for all channels
    this.channels.forEach((channelInfo) => {
      channelInfo.circuitBreakerOpen = false;
      channelInfo.reconnectAttempts = 0;
    });

    setTimeout(() => {
      this.checkAndReconnectIfNeeded();
    }, 3000);
  }

  private handleOffline(): void {
    this.isOnline = false;
    this.connectionHealth.isHealthy = false;
  }

  private createKeepAliveChannel(): void {
    if (this.keepAliveChannel) {
      this.client.removeChannel(this.keepAliveChannel);
    }

    this.keepAliveChannel = this.client
      .channel("keep-alive", {
        config: {
          broadcast: { self: false },
          presence: { key: "keep-alive" },
        },
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          this.connectionHealth.isHealthy = true;
          this.connectionHealth.lastPongTime = Date.now();
          this.connectionHealth.consecutiveFailures = 0;
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          this.connectionHealth.isHealthy = false;
          this.connectionHealth.consecutiveFailures++;

          // Open global circuit breaker if too many failures
          if (
            this.connectionHealth.consecutiveFailures >=
            this.MAX_CONSECUTIVE_FAILURES
          ) {
            this.openGlobalCircuitBreaker();
          }
        }
      });
  }

  private openGlobalCircuitBreaker(): void {
    console.warn("Opening global circuit breaker due to consecutive failures");
    this.globalCircuitBreakerOpen = true;
    this.globalCircuitBreakerOpenTime = Date.now();

    // Auto-close circuit breaker after timeout
    setTimeout(() => {
      this.globalCircuitBreakerOpen = false;
      this.connectionHealth.consecutiveFailures = 0;
    }, this.CIRCUIT_BREAKER_TIMEOUT);
  }

  private startHealthChecking(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  private performHealthCheck(): void {
    if (!this.isTabVisible || !this.isOnline || this.globalCircuitBreakerOpen)
      return;

    const now = Date.now();
    const timeSinceLastPong = now - this.connectionHealth.lastPongTime;

    // Check if we have any active subscribed channels
    let subscribedChannels = 0;
    let totalActiveChannels = 0;

    this.channels.forEach((channelInfo) => {
      if (channelInfo.refCount > 0) {
        totalActiveChannels++;
        if (channelInfo.currentStatus === "SUBSCRIBED") {
          subscribedChannels++;
        }
      }
    });

    // If we have active subscribed channels, consider the connection healthy
    // regardless of keep-alive pong timing
    const channelsHealthy =
      totalActiveChannels > 0 &&
      subscribedChannels >= totalActiveChannels * 0.8;

    // Only mark as unhealthy if:
    // 1. No pong in a very long time (3x interval) AND
    // 2. Less than 80% of channels are subscribed
    if (
      timeSinceLastPong > this.HEALTH_CHECK_INTERVAL * 4 &&
      !channelsHealthy
    ) {
      console.log(`[${this.instanceId}] Connection appears unhealthy:`, {
        timeSinceLastPong: `${timeSinceLastPong}ms`,
        subscribedChannels,
        totalActiveChannels,
        healthPercentage:
          totalActiveChannels > 0
            ? `${((subscribedChannels / totalActiveChannels) * 100).toFixed(
                1
              )}%`
            : "0%",
      });

      this.connectionHealth.isHealthy = false;

      // Only attempt reconnection if conditions are met and not too recent
      if (this.shouldAttemptReconnection() && !this.pendingReconnectTimeout) {
        console.log(
          `[${this.instanceId}] Health check triggering reconnection check`
        );
        this.checkConnectionHealthBeforeReconnect();
      }
    } else {
      // Connection seems healthy
      if (!this.connectionHealth.isHealthy && channelsHealthy) {
        console.log(
          `[${this.instanceId}] Connection appears to have recovered:`,
          {
            subscribedChannels,
            totalActiveChannels,
            healthPercentage: `${(
              (subscribedChannels / totalActiveChannels) *
              100
            ).toFixed(1)}%`,
          }
        );
        this.connectionHealth.isHealthy = true;
        this.connectionHealth.consecutiveFailures = 0;
      }
    }

    this.connectionHealth.lastPingTime = now;
  }

  private shouldAttemptReconnection(): boolean {
    return (
      this.isOnline &&
      this.isTabVisible &&
      !this.globalCircuitBreakerOpen &&
      this.connectionHealth.consecutiveFailures < this.MAX_CONSECUTIVE_FAILURES
    );
  }

  private checkConnectionHealthBeforeReconnect(): void {
    if (!this.shouldAttemptReconnection()) {
      console.log(
        `[${this.instanceId}] Skipping reconnection - conditions not met`
      );
      return;
    }

    const now = Date.now();
    let hasUnhealthyChannels = false;
    let subscribedChannels = 0;
    let totalActiveChannels = 0;
    let channelStatusSummary: string[] = [];

    this.channels.forEach((channelInfo, topic) => {
      if (channelInfo.refCount > 0) {
        totalActiveChannels++;
        const timeSinceActivity = now - channelInfo.lastActivity;
        const isStatusError = ["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(
          channelInfo.currentStatus
        );

        channelStatusSummary.push(
          `${topic}: ${channelInfo.currentStatus} (${timeSinceActivity}ms ago)`
        );

        if (channelInfo.currentStatus === "SUBSCRIBED") {
          subscribedChannels++;
        }

        // Only consider reconnection if status explicitly indicates error
        // Don't use global health or activity timing - trust the channel status
        if (isStatusError) {
          hasUnhealthyChannels = true;
        }
      }
    });

    // Calculate health percentage
    const healthPercentage =
      totalActiveChannels > 0
        ? (subscribedChannels / totalActiveChannels) * 100
        : 0;

    console.log(`[${this.instanceId}] Connection health check:`, {
      subscribedChannels,
      totalActiveChannels,
      healthPercentage: `${healthPercentage.toFixed(1)}%`,
      hasUnhealthyChannels,
      globalHealthy: this.connectionHealth.isHealthy,
      channels: channelStatusSummary,
    });

    // Only reconnect if we have channels with explicit error status
    // Ignore global health if individual channels are working
    if (hasUnhealthyChannels) {
      console.log(
        `[${this.instanceId}] Found channels with error status, attempting targeted reconnection...`
      );
      this.checkAndReconnectIfNeeded();
    } else if (healthPercentage >= 80) {
      console.log(
        `[${this.instanceId}] Connections are ${healthPercentage.toFixed(
          1
        )}% healthy, skipping reconnection`
      );
      // Reset circuit breakers if connections are proven healthy
      if (
        this.globalCircuitBreakerOpen ||
        this.connectionHealth.consecutiveFailures > 0
      ) {
        this.resetCircuitBreakers();
      } else {
        // Just reset global health
        this.connectionHealth.isHealthy = true;
        this.connectionHealth.consecutiveFailures = 0;
      }
    } else {
      console.log(
        `[${this.instanceId}] Health at ${healthPercentage.toFixed(
          1
        )}% but no explicit errors, monitoring...`
      );
    }
  }

  private checkAndReconnectIfNeeded(): void {
    if (!this.shouldAttemptReconnection()) {
      return;
    }

    // Only reconnect channels that actually have error status
    let reconnectionAttempted = false;

    this.channels.forEach((channelInfo, topic) => {
      if (this.shouldReconnectChannel(channelInfo)) {
        console.log(
          `[${this.instanceId}] Reconnecting channel with error status: ${topic} (${channelInfo.currentStatus})`
        );
        this.reconnectChannel(topic);
        reconnectionAttempted = true;
      }
    });

    // Only reconnect keep-alive if we actually attempted channel reconnections
    // or if keep-alive specifically has an error
    if (reconnectionAttempted || !this.connectionHealth.isHealthy) {
      const keepAliveNeedsReconnect = this.keepAliveChannel === null;
      if (keepAliveNeedsReconnect) {
        console.log(`[${this.instanceId}] Reconnecting keep-alive channel`);
        this.createKeepAliveChannel();
      }
    }

    if (!reconnectionAttempted) {
      console.log(`[${this.instanceId}] No channels require reconnection`);
    }
  }

  private shouldReconnectChannel(channelInfo: ChannelInfo): boolean {
    const now = Date.now();

    return (
      channelInfo.refCount > 0 &&
      !channelInfo.isReconnecting &&
      !channelInfo.circuitBreakerOpen &&
      channelInfo.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS &&
      now - channelInfo.lastReconnectTime > this.MIN_RECONNECT_INTERVAL &&
      (channelInfo.currentStatus === "CHANNEL_ERROR" ||
        channelInfo.currentStatus === "TIMED_OUT" ||
        channelInfo.currentStatus === "CLOSED")
    );
  }

  private reconnectChannel(topic: string): void {
    const channelInfo = this.channels.get(topic);
    if (!channelInfo || !this.shouldReconnectChannel(channelInfo)) {
      return;
    }

    channelInfo.isReconnecting = true;
    channelInfo.lastReconnectTime = Date.now();
    channelInfo.reconnectAttempts++;

    console.log(
      `Attempting reconnection ${channelInfo.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS} for ${topic}`
    );

    // Calculate delay with jitter to prevent thundering herd
    const baseDelay = Math.min(
      this.RECONNECT_DELAY_BASE *
        Math.pow(2, channelInfo.reconnectAttempts - 1),
      this.MAX_RECONNECT_DELAY
    );
    const jitter = Math.random() * 1000;
    const delay = baseDelay + jitter;

    setTimeout(() => {
      this.performChannelReconnection(topic);
    }, delay);
  }

  private performChannelReconnection(topic: string): void {
    const channelInfo = this.channels.get(topic);
    if (!channelInfo) return;

    // Check if we should still reconnect
    if (!this.shouldAttemptReconnection() || channelInfo.refCount === 0) {
      channelInfo.isReconnecting = false;
      return;
    }

    // Open circuit breaker if max attempts reached
    if (channelInfo.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.warn(
        `Max reconnection attempts reached for ${topic}, opening circuit breaker`
      );
      channelInfo.circuitBreakerOpen = true;
      channelInfo.circuitBreakerOpenTime = Date.now();
      channelInfo.isReconnecting = false;

      // Auto-close circuit breaker after timeout
      setTimeout(() => {
        channelInfo.circuitBreakerOpen = false;
        channelInfo.reconnectAttempts = 0;
      }, this.CIRCUIT_BREAKER_TIMEOUT);

      return;
    }

    try {
      this.client.removeChannel(channelInfo.channel);

      const newChannel = this.client
        .channel(topic, { config: { broadcast: { self: false } } })
        .on(
          "broadcast",
          { event: "*" },
          ({ event: receivedEvent, payload }) => {
            const info = this.channels.get(topic);
            const handlers = info?.handlers.get(receivedEvent);
            if (handlers) {
              info.lastActivity = Date.now();
              handlers.forEach((handler) => {
                try {
                  handler(payload);
                } catch (err) {
                  console.error(
                    `Error in handler for ${topic}/${receivedEvent}:`,
                    err
                  );
                }
              });
            }
          }
        )
        .subscribe((status, error) => {
          const info = this.channels.get(topic);
          if (!info) return;

          info.isReconnecting = false;

          if (error) {
            console.error(`Subscription error for '${topic}':`, error);
          }

          info.lastActivity = Date.now();

          if (status === "SUBSCRIBED") {
            console.log(`Successfully reconnected to ${topic}`);
            info.reconnectAttempts = 0;
            info.circuitBreakerOpen = false;
            this.connectionHealth.isHealthy = true;
            this.connectionHealth.consecutiveFailures = 0;

            // Reset global circuit breaker if this was the issue
            if (this.globalCircuitBreakerOpen) {
              this.resetCircuitBreakers();
            }
          } else if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            console.warn(`Connection failed for ${topic}: ${status}`);
            // Don't immediately retry - let health check handle it
          }

          this.emitStatus(topic, status);
        });

      channelInfo.channel = newChannel;
      channelInfo.currentStatus = "CONNECTING";
    } catch (error) {
      console.error(`Error during reconnection for ${topic}:`, error);
      channelInfo.isReconnecting = false;
    }
  }

  public static getInstance(
    client: SupabaseClient = supabase
  ): SubscriptionManager {
    if (!SubscriptionManager.instance) {
      SubscriptionManager.instance = new SubscriptionManager(client);
    }
    return SubscriptionManager.instance;
  }

  public subscribeBroadcast(
    topic: string,
    event: string,
    callback: (payload: any) => void
  ): void {
    const cleanupTimer = this.cleanupTimers.get(topic);
    if (cleanupTimer) {
      clearTimeout(cleanupTimer);
      this.cleanupTimers.delete(topic);
    }

    let channelInfo = this.channels.get(topic);

    if (!channelInfo) {
      const channel = this.client
        .channel(topic, { config: { broadcast: { self: false } } })
        .on(
          "broadcast",
          { event: "*" },
          ({ event: receivedEvent, payload }) => {
            const info = this.channels.get(topic);
            const handlers = info?.handlers.get(receivedEvent);
            if (handlers) {
              info.lastActivity = Date.now();
              handlers.forEach((handler) => {
                try {
                  handler(payload);
                } catch (err) {
                  console.error(
                    `Error in handler for ${topic}/${receivedEvent}:`,
                    err
                  );
                }
              });
            }
          }
        )
        .subscribe((status, error) => {
          if (error) {
            console.error(`Subscription error for '${topic}':`, error);
          }

          const info = this.channels.get(topic);
          if (info) {
            info.lastActivity = Date.now();
            info.isReconnecting = false;

            if (status === "SUBSCRIBED") {
              info.reconnectAttempts = 0;
              info.circuitBreakerOpen = false;
              this.connectionHealth.isHealthy = true;

              // Reset global circuit breaker on successful subscription
              if (this.globalCircuitBreakerOpen) {
                this.resetCircuitBreakers();
              }
            }
          }

          this.emitStatus(topic, status);
        });

      channelInfo = {
        channel,
        handlers: new Map(),
        refCount: 0,
        currentStatus: "CONNECTING",
        lastActivity: Date.now(),
        reconnectAttempts: 0,
        lastReconnectTime: 0,
        isReconnecting: false,
        circuitBreakerOpen: false,
        circuitBreakerOpenTime: 0,
      };
      this.channels.set(topic, channelInfo);
    }

    if (!channelInfo.handlers.has(event)) {
      channelInfo.handlers.set(event, new Set());
    }
    channelInfo.handlers.get(event)!.add(callback);
    channelInfo.refCount++;
    channelInfo.lastActivity = Date.now();

    console.log(
      `Subscribed to ${topic}/${event} (refCount: ${channelInfo.refCount})`
    );
  }

  public unsubscribe(topic: string): void {
    const channelInfo = this.channels.get(topic);
    if (!channelInfo) return;

    const timer = setTimeout(() => {
      const info = this.channels.get(topic);
      if (!info) return;

      if (info.refCount <= 1) {
        console.log(`Removing channel '${topic}' after delay`);
        this.client.removeChannel(info.channel);
        this.channels.delete(topic);
        this.statusListeners.delete(topic);
      }

      this.cleanupTimers.delete(topic);
    }, this.CLEANUP_DELAY);

    this.cleanupTimers.set(topic, timer);
    channelInfo.refCount = Math.max(0, channelInfo.refCount - 1);

    console.log(
      `Scheduled cleanup for ${topic} (refCount: ${channelInfo.refCount})`
    );
  }

  public forceReconnect(topic?: string): void {
    if (!this.shouldAttemptReconnection()) {
      console.log(
        `[${this.instanceId}] Reconnection blocked by circuit breaker or conditions`
      );
      return;
    }

    if (topic) {
      const channelInfo = this.channels.get(topic);
      if (channelInfo && !channelInfo.isReconnecting) {
        // Reset attempts for manual reconnection
        channelInfo.reconnectAttempts = 0;
        channelInfo.circuitBreakerOpen = false;
        this.reconnectChannel(topic);
      }
    } else {
      // Reset global circuit breaker for manual reconnection
      this.globalCircuitBreakerOpen = false;
      this.connectionHealth.consecutiveFailures = 0;
      this.checkAndReconnectIfNeeded();
    }
  }

  /**
   * Reset circuit breakers when connections are proven healthy
   */
  private resetCircuitBreakers(): void {
    console.log(
      `[${this.instanceId}] Resetting circuit breakers - connections proven healthy`
    );

    this.globalCircuitBreakerOpen = false;
    this.connectionHealth.consecutiveFailures = 0;
    this.connectionHealth.isHealthy = true;

    this.channels.forEach((channelInfo) => {
      if (channelInfo.currentStatus === "SUBSCRIBED") {
        channelInfo.circuitBreakerOpen = false;
        channelInfo.reconnectAttempts = 0;
      }
    });
  }

  public getConnectionHealth(): ConnectionHealth & {
    globalCircuitBreakerOpen: boolean;
    channelStates: Array<{
      topic: string;
      status: string;
      reconnectAttempts: number;
      circuitBreakerOpen: boolean;
    }>;
  } {
    const channelStates = Array.from(this.channels.entries()).map(
      ([topic, info]) => ({
        topic,
        status: info.currentStatus,
        reconnectAttempts: info.reconnectAttempts,
        circuitBreakerOpen: info.circuitBreakerOpen,
      })
    );

    return {
      ...this.connectionHealth,
      globalCircuitBreakerOpen: this.globalCircuitBreakerOpen,
      channelStates,
    };
  }

  public cleanup(): void {
    console.log(`[${this.instanceId}] Cleaning up SubscriptionManager`);

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.pendingReconnectTimeout) {
      clearTimeout(this.pendingReconnectTimeout);
      this.pendingReconnectTimeout = null;
    }

    this.cleanupTimers.forEach((timer) => clearTimeout(timer));
    this.cleanupTimers.clear();

    this.channels.forEach((info, topic) => {
      this.client.removeChannel(info.channel);
    });
    this.channels.clear();

    if (this.keepAliveChannel) {
      this.client.removeChannel(this.keepAliveChannel);
      this.keepAliveChannel = null;
    }

    this.statusListeners.clear();

    if (typeof window !== "undefined") {
      document.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange.bind(this)
      );
      window.removeEventListener("focus", this.handleWindowFocus.bind(this));
      window.removeEventListener("online", this.handleOnline.bind(this));
      window.removeEventListener("offline", this.handleOffline.bind(this));
    }
  }

  public onStatusChange(
    topic: string,
    listener: (status: string) => void
  ): void {
    if (!this.statusListeners.has(topic)) {
      this.statusListeners.set(topic, new Set());
    }
    this.statusListeners.get(topic)!.add(listener);

    const channelInfo = this.channels.get(topic);
    if (channelInfo && channelInfo.currentStatus !== "CONNECTING") {
      setTimeout(() => listener(channelInfo.currentStatus), 0);
    }
  }

  public offStatusChange(
    topic: string,
    listener: (status: string) => void
  ): void {
    this.statusListeners.get(topic)?.delete(listener);
  }

  private emitStatus(topic: string, status: string): void {
    const channelInfo = this.channels.get(topic);
    if (channelInfo) {
      channelInfo.currentStatus = status;
    }

    this.statusListeners.get(topic)?.forEach((listener) => listener(status));
  }
}

export const subscriptionManager = SubscriptionManager.getInstance();
