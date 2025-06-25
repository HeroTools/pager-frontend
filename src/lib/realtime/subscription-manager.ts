import { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

interface ChannelInfo {
  channel: RealtimeChannel;
  handlers: Map<string, Set<(payload: any) => void>>;
  refCount: number;
  currentStatus: string; // Track current status
}

/**
 * Manages Supabase Realtime channels without closing the WebSocket.
 * Uses reference counting and delayed cleanup to handle rapid channel switches.
 */
export class SubscriptionManager {
  private static instance: SubscriptionManager;
  private client: SupabaseClient;
  private channels: Map<string, ChannelInfo>;
  private statusListeners: Map<string, Set<(status: string) => void>>;
  private cleanupTimers: Map<string, NodeJS.Timeout>;
  private keepAliveChannel: RealtimeChannel | null = null;

  // Delay before removing a channel (gives time for new subscriptions)
  private readonly CLEANUP_DELAY = 1000; // 1 second

  private constructor(client: SupabaseClient) {
    this.client = client;
    this.channels = new Map();
    this.statusListeners = new Map();
    this.cleanupTimers = new Map();

    // Create a keep-alive channel to prevent WebSocket disconnection
    this.createKeepAliveChannel();
  }

  /**
   * Creates a dummy channel to keep the WebSocket connection alive
   */
  private createKeepAliveChannel(): void {
    // This channel does nothing but keeps the WebSocket open
    this.keepAliveChannel = this.client
      .channel("keep-alive", { config: { broadcast: { self: false } } })
      .subscribe();
  }

  public static getInstance(
    client: SupabaseClient = supabase
  ): SubscriptionManager {
    if (!SubscriptionManager.instance) {
      SubscriptionManager.instance = new SubscriptionManager(client);
    }
    return SubscriptionManager.instance;
  }

  /**
   * Subscribe to broadcast events for a given topic.
   * The channel is reference counted and won't be removed immediately when unsubscribed.
   */
  public subscribeBroadcast(
    topic: string,
    event: string,
    callback: (payload: any) => void
  ): void {
    // Cancel any pending cleanup for this topic
    const cleanupTimer = this.cleanupTimers.get(topic);
    if (cleanupTimer) {
      clearTimeout(cleanupTimer);
      this.cleanupTimers.delete(topic);
    }

    let channelInfo = this.channels.get(topic);

    if (!channelInfo) {
      // Create new channel
      const channel = this.client
        .channel(topic, { config: { broadcast: { self: false } } })
        .on(
          "broadcast",
          { event: "*" },
          ({ event: receivedEvent, payload }) => {
            // Route to appropriate handlers
            const info = this.channels.get(topic);
            const handlers = info?.handlers.get(receivedEvent);
            if (handlers) {
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
          this.emitStatus(topic, status);
        });

      channelInfo = {
        channel,
        handlers: new Map(),
        refCount: 0,
        currentStatus: "CONNECTING", // Initialize status
      };
      this.channels.set(topic, channelInfo);
    }

    // Add handler for this event
    if (!channelInfo.handlers.has(event)) {
      channelInfo.handlers.set(event, new Set());
    }
    channelInfo.handlers.get(event)!.add(callback);
    channelInfo.refCount++;

    console.log(
      `Subscribed to ${topic}/${event} (refCount: ${channelInfo.refCount})`
    );
  }

  /**
   * Unsubscribe from a topic. Uses delayed cleanup to handle rapid channel switches.
   */
  public unsubscribe(topic: string): void {
    const channelInfo = this.channels.get(topic);
    if (!channelInfo) return;

    // Schedule cleanup with delay (won't execute if re-subscribed)
    const timer = setTimeout(() => {
      const info = this.channels.get(topic);
      if (!info) return;

      // Only remove if no one else is using this channel
      if (info.refCount <= 1) {
        console.log(`Removing channel '${topic}' after delay`);
        this.client.removeChannel(info.channel);
        this.channels.delete(topic);
        this.statusListeners.delete(topic);
      }

      this.cleanupTimers.delete(topic);
    }, this.CLEANUP_DELAY);

    this.cleanupTimers.set(topic, timer);

    // Decrement ref count immediately
    channelInfo.refCount = Math.max(0, channelInfo.refCount - 1);
    console.log(
      `Scheduled cleanup for ${topic} (refCount: ${channelInfo.refCount})`
    );
  }

  /**
   * Clean up all resources (call on logout/unmount)
   */
  public cleanup(): void {
    // Clear all pending timers
    this.cleanupTimers.forEach((timer) => clearTimeout(timer));
    this.cleanupTimers.clear();

    // Remove all channels
    this.channels.forEach((info, topic) => {
      this.client.removeChannel(info.channel);
    });
    this.channels.clear();

    // Remove keep-alive channel
    if (this.keepAliveChannel) {
      this.client.removeChannel(this.keepAliveChannel);
      this.keepAliveChannel = null;
    }

    this.statusListeners.clear();
  }

  public onStatusChange(
    topic: string,
    listener: (status: string) => void
  ): void {
    if (!this.statusListeners.has(topic)) {
      this.statusListeners.set(topic, new Set());
    }
    this.statusListeners.get(topic)!.add(listener);

    // Immediately emit current status if channel exists and is connected
    const channelInfo = this.channels.get(topic);
    if (channelInfo && channelInfo.currentStatus !== "CONNECTING") {
      // Use setTimeout to avoid sync emission during render
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
    // Update stored status
    const channelInfo = this.channels.get(topic);
    if (channelInfo) {
      channelInfo.currentStatus = status;
    }

    // Emit to all listeners
    this.statusListeners.get(topic)?.forEach((listener) => listener(status));
  }
}

export const subscriptionManager = SubscriptionManager.getInstance();
