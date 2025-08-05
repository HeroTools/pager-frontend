import { supabase } from '@/lib/supabase/client';
import { REALTIME_SUBSCRIBE_STATES } from '@supabase/realtime-js';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

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
  maxRetryAttempts?: number;
  enableVisibilityOptimization?: boolean;
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

const isNetworkError = (err: Error): boolean => {
  return (err.message?.includes('network') || err.message?.includes('connection')) ?? false;
};

export class RealtimeHandler<T extends SupabaseClient> {
  private readonly inactiveTabTimeoutSeconds: number;
  private readonly maxRetryAttempts: number;
  private readonly enableVisibilityOptimization: boolean;
  private readonly supabaseClient: T;

  private readonly channelFactories: RealtimeChannelFactories<T> = new Map();
  private readonly channels: RealtimeChannels = new Map();
  private readonly subscriptionEventCallbacks: SubscriptionEventCallbacksMap = new Map();
  private readonly retryCounts: Map<Topic, number> = new Map();
  private readonly retryTimers: Map<Topic, ReturnType<typeof setTimeout>> = new Map();

  private inactiveTabTimer?: ReturnType<typeof setTimeout>;
  private started = false;
  private isTabVisible = true;

  constructor(supabaseClient: T, config?: RealtimeHandlerConfig) {
    this.supabaseClient = supabaseClient;
    this.inactiveTabTimeoutSeconds = config?.inactiveTabTimeoutSeconds ?? 600; // 10 minutes default
    this.maxRetryAttempts = config?.maxRetryAttempts ?? 10;
    this.enableVisibilityOptimization = config?.enableVisibilityOptimization ?? true;
    this.isTabVisible = typeof document !== 'undefined' ? !document.hidden : true;
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
    this.clearRetryTimer(topic);
    this.unsubscribeFromChannel(topic);
  }

  public reconnectChannel(topic: Topic): void {
    this.clearRetryTimer(topic);
    this.retryCounts.set(topic, 0);
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
      this.clearAllRetryTimers();
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

  private clearRetryTimer(topic: Topic): void {
    const timer = this.retryTimers.get(topic);
    if (timer) {
      clearTimeout(timer);
      this.retryTimers.delete(topic);
    }
  }

  private clearAllRetryTimers(): void {
    for (const timer of this.retryTimers.values()) {
      clearTimeout(timer);
    }
    this.retryTimers.clear();
  }

  private scheduleResubscribe(topic: Topic, attempt: number): void {
    this.clearRetryTimer(topic);

    if (attempt >= this.maxRetryAttempts) {
      console.warn(`[RealtimeHandler] Max retry attempts reached for ${topic}`);
      return;
    }

    const backoff = Math.min(30000, Math.max(1000, 2 ** attempt * 1000)); // Min 1s, Max 30s
    const jitter = backoff * 0.1 * (Math.random() * 2 - 1); // +/- 10% jitter
    const delay = Math.max(0, backoff + jitter);

    const timer = setTimeout(() => {
      this.resubscribeToChannel(topic, attempt);
    }, delay);

    this.retryTimers.set(topic, timer);
    this.retryCounts.set(topic, attempt + 1);
  }

  private resubscribeToChannel(topic: Topic, attempt: number = 0): void {
    const factory = this.channelFactories.get(topic);
    if (!factory) {
      console.warn(`[RealtimeHandler] No factory found for topic ${topic}`);
      return;
    }

    this.unsubscribeFromChannel(topic);
    const channel = this.createChannel(factory);
    this.subscribeToChannel(channel);
  }

  private async subscribeToChannel(channel: RealtimeChannel): Promise<void> {
    // Always try to subscribe, don't check state as it might be stale

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
        this.clearRetryTimer(topic);
        callbacks?.onSubscribe?.(channel);
        break;

      case REALTIME_SUBSCRIBE_STATES.CLOSED:
        callbacks?.onClose?.(channel);
        // Always try to reconnect when channel closes
        this.scheduleResubscribe(topic, attempt);
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

        // Always retry on errors, but handle token expiry immediately
        if (err && isTokenExpiredError(err)) {
          this.scheduleResubscribe(topic, 0); // Immediate retry for token issues
        } else {
          // For other errors, use exponential backoff
          this.scheduleResubscribe(topic, attempt);
        }
        break;
    }
  }

  private async refreshSessionIfNeeded(): Promise<void> {
    try {
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
    } catch (error) {
      throw error;
    }
  }

  private addOnVisibilityChangeListener = (): (() => void) => {
    if (typeof document === 'undefined' || !this.enableVisibilityOptimization) {
      return () => {};
    }

    const handler = (): void => {
      this.handleVisibilityChange();
    };

    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  };

  private handleVisibilityChange = (): void => {
    if (typeof document === 'undefined' || !this.enableVisibilityOptimization) {
      return;
    }

    const isNowVisible = !document.hidden;

    if (this.isTabVisible === isNowVisible) {
      return; // No change
    }

    this.isTabVisible = isNowVisible;

    if (!isNowVisible) {
      // Tab became hidden - set timer for eventual disconnect
      this.inactiveTabTimer = setTimeout(() => {
        this.unsubscribeFromAllChannels();
      }, this.inactiveTabTimeoutSeconds * 1000);
    } else {
      // Tab became visible - cancel disconnect timer and ensure we're connected
      if (this.inactiveTabTimer) {
        clearTimeout(this.inactiveTabTimer);
        this.inactiveTabTimer = undefined;
      }

      // Check if any channels are disconnected and reconnect
      for (const topic of this.channelFactories.keys()) {
        const channel = this.channels.get(topic);
        if (!channel || !['joined', 'joining'].includes(channel.state)) {
          this.scheduleResubscribe(topic, 0);
        }
      }
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

export const messageRealtimeHandler = new RealtimeHandler(supabase, {
  inactiveTabTimeoutSeconds: 600, // 10 minutes
  maxRetryAttempts: 10,
  enableVisibilityOptimization: true,
});

export const notificationsRealtimeHandler = new RealtimeHandler(supabase, {
  inactiveTabTimeoutSeconds: 24 * 60 * 60, // 1 day
  maxRetryAttempts: 15,
  enableVisibilityOptimization: false, // Keep notifications always connected
});
