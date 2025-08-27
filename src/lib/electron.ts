// Electron utilities and environment detection

declare global {
  interface Window {
    electronAPI?: {
      fileProxy: (
        url: string,
        headers?: Record<string, string>,
      ) => Promise<{
        success: boolean;
        data?: Buffer;
        contentType?: string;
        status: number;
        error?: string;
      }>;
      showNotification: (title: string, options?: NotificationOptions) => Promise<boolean>;
      onNotificationClicked: (callback: (event: any, data: any) => void) => void;
      windowMinimize: () => Promise<void>;
      windowMaximize: () => Promise<void>;
      windowClose: () => Promise<void>;
      getAppVersion: () => Promise<string>;
      isDev: () => Promise<boolean>;
      openExternal: (url: string) => Promise<void>;
      isElectron: boolean;
      platform: string;
      removeAllListeners: (channel: string) => void;
    };
    isElectronApp?: boolean;
    electronShortcuts?: {
      onShortcut: (shortcut: string, callback: () => void) => () => void;
    };
    electronLog?: {
      info: (...args: any[]) => void;
      warn: (...args: any[]) => void;
      error: (...args: any[]) => void;
    };
  }
}

interface ElectronNotificationOptions {
  body?: string;
  icon?: string;
  silent?: boolean;
  urgency?: 'low' | 'normal' | 'critical';
  timeoutType?: 'default' | 'never';
  data?: any;
}

/**
 * Check if the app is running in Electron
 */
export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && !!window.isElectronApp;
};

/**
 * Check if the app is running in development mode
 */
export const isDev = async (): Promise<boolean> => {
  if (isElectron() && window.electronAPI) {
    return await window.electronAPI.isDev();
  }
  return process.env.NODE_ENV === 'development';
};

/**
 * Get app version
 */
export const getAppVersion = async (): Promise<string> => {
  if (isElectron() && window.electronAPI) {
    return await window.electronAPI.getAppVersion();
  }
  return '1.0.0'; // Default for web
};

/**
 * Show notification (native in Electron, web notifications otherwise)
 */
export const showNotification = async (
  title: string,
  options: ElectronNotificationOptions = {},
): Promise<boolean> => {
  if (isElectron() && window.electronAPI) {
    // Use native Electron notifications
    return await window.electronAPI.showNotification(title, options);
  } else {
    // Use web notifications
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body: options.body,
          icon: options.icon,
          silent: options.silent,
        });
        return true;
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(title, {
            body: options.body,
            icon: options.icon,
            silent: options.silent,
          });
          return true;
        }
      }
    }
    return false;
  }
};

/**
 * Handle file proxy for secure file access
 */
export const fileProxy = async (
  url: string,
  headers: Record<string, string> = {},
): Promise<{
  success: boolean;
  data?: ArrayBuffer;
  contentType?: string;
  status: number;
  error?: string;
}> => {
  if (isElectron() && window.electronAPI) {
    // Use Electron main process for file proxy
    const result = await window.electronAPI.fileProxy(url, headers);
    return {
      ...result,
      data: result.data ? new Uint8Array(result.data).buffer : undefined,
    };
  } else {
    // Use web API route for file proxy
    try {
      const response = await fetch(`/api/files/proxy?storageUrl=${encodeURIComponent(url)}`, {
        headers,
      });

      if (!response.ok) {
        return {
          success: false,
          status: response.status,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'application/octet-stream';

      return {
        success: true,
        data,
        contentType,
        status: response.status,
      };
    } catch (error) {
      return {
        success: false,
        status: 500,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
};

/**
 * Open external URL
 */
export const openExternal = async (url: string): Promise<void> => {
  if (isElectron() && window.electronAPI) {
    await window.electronAPI.openExternal(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

/**
 * Window controls (Electron only)
 */
export const windowControls = {
  minimize: async (): Promise<void> => {
    if (isElectron() && window.electronAPI) {
      await window.electronAPI.windowMinimize();
    }
  },

  maximize: async (): Promise<void> => {
    if (isElectron() && window.electronAPI) {
      await window.electronAPI.windowMaximize();
    }
  },

  close: async (): Promise<void> => {
    if (isElectron() && window.electronAPI) {
      await window.electronAPI.windowClose();
    }
  },
};

/**
 * Register keyboard shortcuts (Electron enhanced)
 */
export const registerShortcut = (shortcut: string, callback: () => void): (() => void) => {
  if (isElectron() && window.electronShortcuts) {
    return window.electronShortcuts.onShortcut(shortcut, callback);
  } else {
    // Fallback for web - basic keyboard event handling
    const handler = (event: KeyboardEvent) => {
      const keys = [];
      if (event.metaKey || event.ctrlKey) keys.push('cmd');
      if (event.altKey) keys.push('alt');
      if (event.shiftKey) keys.push('shift');
      keys.push(event.key.toLowerCase());

      const shortcutKey = keys.join('+');
      if (shortcutKey === shortcut) {
        event.preventDefault();
        callback();
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }
};

/**
 * Enhanced logging for Electron
 */
export const electronLog = {
  info: (...args: any[]): void => {
    if (isElectron() && window.electronLog) {
      window.electronLog.info(...args);
    } else {
      console.log('[Web]', ...args);
    }
  },

  warn: (...args: any[]): void => {
    if (isElectron() && window.electronLog) {
      window.electronLog.warn(...args);
    } else {
      console.warn('[Web]', ...args);
    }
  },

  error: (...args: any[]): void => {
    if (isElectron() && window.electronLog) {
      window.electronLog.error(...args);
    } else {
      console.error('[Web]', ...args);
    }
  },
};

/**
 * Platform-specific behavior helper
 */
export const platform = {
  isMac: (): boolean => {
    if (isElectron() && window.electronAPI) {
      return window.electronAPI.platform === 'darwin';
    }
    return typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac');
  },

  isWindows: (): boolean => {
    if (isElectron() && window.electronAPI) {
      return window.electronAPI.platform === 'win32';
    }
    return typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('win');
  },

  isLinux: (): boolean => {
    if (isElectron() && window.electronAPI) {
      return window.electronAPI.platform === 'linux';
    }
    return typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('linux');
  },
};
