import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { REALTIME_SUBSCRIBE_STATES } from '@supabase/realtime-js';
import { supabase } from '@/lib/supabase/client';

export type Topic = string;

export type ChannelFactory<T extends SupabaseClient = SupabaseClient> = (
  supabase: T,
) => RealtimeChannel;

export type RealtimeChannelFactories<T extends SupabaseClient = SupabaseClient> = Map<
  Topic,
  ChannelFactory<T>
>;

export type RealtimeChannels = Map<Topic, RealtimeChannel>;

export interface RealtimeHandlerConfig {
  inactiveTabTimeoutSeconds?: number;
}

export interface SubscriptionEventCallbacks {
  onSubscribe?: (channel: RealtimeChannel) => void;
  onClose?: (channel: RealtimeChannel) => void;
  onTimeout?: (channel: RealtimeChannel) => void;
  onError?: (channel: RealtimeChannel, err: Error) => void;
}

export type SubscriptionEventCallbacksMap = Map<Topic, SubscriptionEventCallbacks>;

type SubscribeStatus = `${REALTIME_SUBSCRIBE_STATES}`;

interface AuthSession {
  access_token?: string;
}

interface AuthData {
  session?: AuthSession | null;
}

interface AuthResponse {
  data: AuthData;
  error: Error | null;
}

const isTokenExpiredError = (err: Error): boolean => {
  return err.message?.includes('token has expired') ?? false;
};

export class RealtimeHandler<T extends SupabaseClient> {
  private readonly inactiveTabTimeoutSeconds: number;
  private readonly supabaseClient: T;

  private readonly channelFactories: RealtimeChannelFactories<T> = new Map();
  private readonly channels: RealtimeChannels = new Map();
  private readonly subscriptionEventCallbacks: SubscriptionEventCallbacksMap = new Map();
  private readonly retryCounts: Map<Topic, number> = new Map();

  private inactiveTabTimer?: ReturnType<typeof setTimeout>;
  private started = false;

  constructor(supabaseClient: T, config?: RealtimeHandlerConfig) {
    this.supabaseClient = supabaseClient;
    this.inactiveTabTimeoutSeconds = config?.inactiveTabTimeoutSeconds ?? 600; // 10 minutes default
  }

  public addChannel(
    factory: ChannelFactory<T>,
    callbacks?: SubscriptionEventCallbacks,
  ): () => void {
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
    if (this.started) {
      return () => {};
    }

    this.started = true;
    this.resubscribeToAllChannels();

    const removeVisibilityListener = this.addOnVisibilityChangeListener();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }

    return () => {
      removeVisibilityListener();

      if (typeof window !== 'undefined') {
        window.removeEventListener('online', this.handleOnline);
        window.removeEventListener('offline', this.handleOffline);
      }

      this.unsubscribeFromAllChannels();
      this.channelFactories.clear();

      if (this.inactiveTabTimer) {
        clearTimeout(this.inactiveTabTimer);
      }

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
    const delay = Math.max(0, backoff + jitter);

    this.retryCounts.set(topic, attempt + 1);

    setTimeout(() => {
      this.resubscribeToChannel(topic);
    }, delay);
  }

  private resubscribeToChannel(topic: Topic): void {
    const factory = this.channelFactories.get(topic);
    if (!factory) {
      return;
    } // Channel was likely removed

    this.unsubscribeFromChannel(topic);
    const channel = this.createChannel(factory);
    this.subscribeToChannel(channel);
  }

  private async subscribeToChannel(channel: RealtimeChannel): Promise<void> {
    if (['joined', 'joining'].includes(channel.state)) {
      return;
    }

    try {
      await this.refreshSessionIfNeeded();

      channel.subscribe((status: SubscribeStatus, err?: Error) => {
        this.handleStateChange(channel, status, err);
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[RealtimeHandler] Error on subscribe for ${channel.topic}:`, errorMessage);

      const subscribeError = error instanceof Error ? error : new Error(errorMessage);
      this.handleStateChange(channel, REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR, subscribeError);
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

  private handleStateChange(channel: RealtimeChannel, status: SubscribeStatus, err?: Error): void {
    const { topic } = channel;
    const callbacks = this.subscriptionEventCallbacks.get(topic);
    const attempt = this.retryCounts.get(topic) ?? 0;

    switch (status) {
      case REALTIME_SUBSCRIBE_STATES.SUBSCRIBED:
        this.retryCounts.set(topic, 0);
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
        if (err) {
          callbacks?.onError?.(channel, err);
        }

        this.unsubscribeFromChannel(topic);

        if (typeof document !== 'undefined') {
          if (!document.hidden || (err && isTokenExpiredError(err))) {
            this.scheduleResubscribe(topic, attempt);
          }
        } else {
          // Fallback for non-browser environments
          this.scheduleResubscribe(topic, attempt);
        }
        break;
    }
  }

  private async refreshSessionIfNeeded(): Promise<void> {
    const response = (await this.supabaseClient.auth.getSession()) as AuthResponse;

    if (response.error) {
      throw response.error;
    }

    const token = response.data.session?.access_token;
    if (!token) {
      throw new Error('No session');
    }

    if (this.supabaseClient.realtime.accessTokenValue !== token) {
      await this.supabaseClient.realtime.setAuth(token);
    }
  }

  private addOnVisibilityChangeListener = (): (() => void) => {
    if (typeof document === 'undefined') {
      return () => {}; // No-op for non-browser environments
    }

    const handler = (): void => {
      this.handleVisibilityChange();
    };

    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  };

  private handleVisibilityChange = (): void => {
    if (typeof document === 'undefined') {
      return;
    }

    if (document.hidden) {
      this.inactiveTabTimer = setTimeout(() => {
        this.unsubscribeFromAllChannels();
      }, this.inactiveTabTimeoutSeconds * 1000);
    } else {
      if (this.inactiveTabTimer) {
        clearTimeout(this.inactiveTabTimer);
      }
      this.resubscribeToAllChannels();
    }
  };

  private handleOnline = (): void => {
    this.resubscribeToAllChannels();
  };

  private handleOffline = (): void => {
    console.warn(
      '[RealtimeHandler] Network is offline. Will attempt to reconnect when back online.',
    );
  };
}

export const messageRealtimeHandler = new RealtimeHandler(supabase);
export const notificationsRealtimeHandler = new RealtimeHandler(supabase, {
  inactiveTabTimeoutSeconds: 24 * 60 * 60, // 1 day
});
