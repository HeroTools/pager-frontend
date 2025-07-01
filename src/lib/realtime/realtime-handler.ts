import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { REALTIME_SUBSCRIBE_STATES } from "@supabase/realtime-js";
import { supabase } from "@/lib/supabase/client";

export type Topic = string;
export type ChannelFactory<T extends SupabaseClient = SupabaseClient> = (
  supabase: T
) => RealtimeChannel;
export type RealtimeChannelFactories<
  T extends SupabaseClient = SupabaseClient
> = Map<Topic, ChannelFactory<T>>;
export type RealtimeChannels = Map<Topic, RealtimeChannel>;

export type RealtimeHandlerConfig = {
  inactiveTabTimeoutSeconds?: number;
};

export type SubscriptionEventCallbacks = {
  onSubscribe?: (channel: RealtimeChannel) => void;
  onClose?: (channel: RealtimeChannel) => void;
  onTimeout?: (channel: RealtimeChannel) => void;
  onError?: (channel: RealtimeChannel, err: Error) => void;
};
export type SubscriptionEventCallbacksMap = Map<
  Topic,
  SubscriptionEventCallbacks
>;

const isTokenExpiredError = (err: Error): boolean =>
  err.message?.includes("token has expired");

export class RealtimeHandler<T extends SupabaseClient> {
  private inactiveTabTimeoutSeconds = 600; // 10 minutes
  private supabaseClient: T;

  private channelFactories: RealtimeChannelFactories<T> = new Map();
  private channels: RealtimeChannels = new Map();
  private subscriptionEventCallbacks: SubscriptionEventCallbacksMap = new Map();
  private retryCounts: Map<Topic, number> = new Map();
  private inactiveTabTimer?: ReturnType<typeof setTimeout>;
  private started = false;

  constructor(supabaseClient: T, config?: RealtimeHandlerConfig) {
    this.supabaseClient = supabaseClient;
    if (config?.inactiveTabTimeoutSeconds) {
      this.inactiveTabTimeoutSeconds = config.inactiveTabTimeoutSeconds;
    }
  }

  public addChannel(
    factory: ChannelFactory<T>,
    callbacks?: SubscriptionEventCallbacks
  ): () => void {
    // Create a temporary channel to get the topic, which is the key for all maps
    const { topic } = factory(this.supabaseClient);

    if (this.channelFactories.has(topic)) {
      this.unsubscribeFromChannel(topic);
    }
    this.channelFactories.set(topic, factory);
    if (callbacks) {
      this.subscriptionEventCallbacks.set(topic, callbacks);
    }
    if (this.started) {
      this.scheduleResubscribe(topic, 0);
    }
    return () => this.removeChannel(topic);
  }

  public removeChannel(topic: Topic): void {
    this.channelFactories.delete(topic);
    this.subscriptionEventCallbacks.delete(topic);
    this.unsubscribeFromChannel(topic);
  }

  public reconnectChannel(topic: Topic): void {
    this.scheduleResubscribe(topic, 0);
  }

  public start(): () => void {
    if (this.started) return () => {};

    this.started = true;
    this.resubscribeToAllChannels();

    const removeVisibilityListener = this.addOnVisibilityChangeListener();
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);

    return () => {
      removeVisibilityListener();
      window.removeEventListener("online", this.handleOnline);
      window.removeEventListener("offline", this.handleOffline);
      this.unsubscribeFromAllChannels();
      this.channelFactories.clear();
      if (this.inactiveTabTimer) clearTimeout(this.inactiveTabTimer);
      this.started = false;
    };
  }

  private createChannel(factory: ChannelFactory<T>): RealtimeChannel {
    const channel = factory(this.supabaseClient);
    this.channels.set(channel.topic, channel);
    return channel;
  }

  private scheduleResubscribe(topic: Topic, attempt: number): void {
    const backoff = Math.min(30000, 2 ** attempt * 1000); // Max 30s
    const jitter = backoff * 0.1 * (Math.random() * 2 - 1); // +/- 10% jitter
    const delay = backoff + jitter;

    this.retryCounts.set(topic, attempt + 1);
    setTimeout(() => this.resubscribeToChannel(topic), delay);
  }

  private resubscribeToChannel(topic: Topic): void {
    const factory = this.channelFactories.get(topic);
    if (!factory) return; // Channel was likely removed

    // Ensure old channel is gone before creating a new one
    this.unsubscribeFromChannel(topic);
    const channel = this.createChannel(factory);
    this.subscribeToChannel(channel);
  }

  private async subscribeToChannel(channel: RealtimeChannel) {
    if (["joined", "joining"].includes(channel.state)) return;

    try {
      await this.refreshSessionIfNeeded();
      channel.subscribe((status, err) =>
        this.handleStateChange(channel, status, err)
      );
    } catch (error) {
      console.error(
        `[RealtimeHandler] Error on subscribe for ${channel.topic}:`,
        error
      );
      this.handleStateChange(
        channel,
        REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR,
        error as Error
      );
    }
  }

  private unsubscribeFromChannel(topic: Topic): void {
    const channel = this.channels.get(topic);
    if (channel) {
      this.supabaseClient.removeChannel(channel);
      this.channels.delete(topic);
    }
  }

  private unsubscribeFromAllChannels(): void {
    for (const topic of this.channels.keys()) {
      this.unsubscribeFromChannel(topic);
    }
  }

  private resubscribeToAllChannels(): void {
    for (const topic of this.channelFactories.keys()) {
      this.scheduleResubscribe(topic, 0);
    }
  }

  private handleStateChange(
    channel: RealtimeChannel,
    status: `${REALTIME_SUBSCRIBE_STATES}`,
    err?: Error
  ): void {
    const { topic } = channel;
    const callbacks = this.subscriptionEventCallbacks.get(topic);
    const attempt = this.retryCounts.get(topic) ?? 0;

    switch (status) {
      case REALTIME_SUBSCRIBE_STATES.SUBSCRIBED:
        this.retryCounts.set(topic, 0); // Reset retry count on success
        callbacks?.onSubscribe?.(channel);
        break;

      case REALTIME_SUBSCRIBE_STATES.CLOSED:
        callbacks?.onClose?.(channel);
        break;

      case REALTIME_SUBSCRIBE_STATES.TIMED_OUT:
        callbacks?.onTimeout?.(channel);
        this.scheduleResubscribe(topic, attempt);
        break;

      case REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR:
        callbacks?.onError?.(channel, err!);
        // 🐛 BUG FIX: Unsubscribe regardless of tab visibility to allow for proper reconnection.
        this.unsubscribeFromChannel(topic);
        // If tab is visible or error is recoverable, attempt to reconnect.
        if (!document.hidden || (err && isTokenExpiredError(err))) {
          this.scheduleResubscribe(topic, attempt);
        }
        break;
    }
  }

  private async refreshSessionIfNeeded() {
    const { data, error } = await this.supabaseClient.auth.getSession();
    if (error) throw error;
    const token = data.session?.access_token;
    if (!token) throw new Error("No session");
    if (this.supabaseClient.realtime.accessTokenValue !== token) {
      await this.supabaseClient.realtime.setAuth(token);
    }
  }

  // --- Event Listeners ---
  private addOnVisibilityChangeListener = (): (() => void) => {
    const handler = () => this.handleVisibilityChange();
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  };

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.inactiveTabTimer = setTimeout(() => {
        this.unsubscribeFromAllChannels();
      }, this.inactiveTabTimeoutSeconds * 1000);
    } else {
      if (this.inactiveTabTimer) clearTimeout(this.inactiveTabTimer);
      this.resubscribeToAllChannels();
    }
  };

  private handleOnline = (): void => this.resubscribeToAllChannels();
  private handleOffline = (): void => {
    // You could optionally call the onError callback for all channels here
    console.warn(
      "[RealtimeHandler] Network is offline. Will attempt to reconnect when back online."
    );
  };
}

export const messageRealtimeHandler = new RealtimeHandler(supabase);
export const notificationsRealtimeHandler = new RealtimeHandler(supabase, {
  inactiveTabTimeoutSeconds: 24 * 60 * 60, // 1 day
});
