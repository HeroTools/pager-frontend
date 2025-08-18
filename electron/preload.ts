import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('app-version'),

  platform: process.platform,

  openExternal: (url: string) => {
    try {
      new URL(url);
      return ipcRenderer.invoke('open-external', url);
    } catch {
      console.error('Invalid URL provided to openExternal');
      return Promise.reject('Invalid URL');
    }
  },

  focusWindow: () => ipcRenderer.invoke('focus-window'),

  requestNotificationPermission: () => ipcRenderer.invoke('request-notification-permission'),
  getNotificationPermission: () => ipcRenderer.invoke('get-notification-permission'),

  showNativeNotification: (id: string, options: any) =>
    ipcRenderer.invoke('show-native-notification', id, options),
  closeNativeNotification: (id: string) => ipcRenderer.invoke('close-native-notification', id),
  closeAllNativeNotifications: () => ipcRenderer.invoke('close-all-native-notifications'),
  checkNativeNotificationSupport: () => ipcRenderer.invoke('check-native-notification-support'),
  requestNativeNotificationPermission: () =>
    ipcRenderer.invoke('request-native-notification-permission'),

  onNotificationClick: (id: string, callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on(`notification-click-${id}`, listener);
    return () => ipcRenderer.removeListener(`notification-click-${id}`, listener);
  },

  onNotificationAction: (id: string, callback: (action: string) => void) => {
    const listener = (_: any, action: string) => callback(action);
    ipcRenderer.on(`notification-action-${id}`, listener);
    return () => ipcRenderer.removeListener(`notification-action-${id}`, listener);
  },

  onNotificationReply: (id: string, callback: (reply: string) => void) => {
    const listener = (_: any, reply: string) => callback(reply);
    ipcRenderer.on(`notification-reply-${id}`, listener);
    return () => ipcRenderer.removeListener(`notification-reply-${id}`, listener);
  },
});

declare global {
  interface Window {
    electronAPI: {
      getAppVersion: () => Promise<string>;
      platform: string;
      openExternal: (url: string) => Promise<void>;
      focusWindow: () => Promise<void>;
      requestNotificationPermission: () => Promise<string>;
      getNotificationPermission: () => Promise<string>;
      showNativeNotification: (id: string, options: any) => Promise<string | null>;
      closeNativeNotification: (id: string) => Promise<void>;
      closeAllNativeNotifications: () => Promise<void>;
      checkNativeNotificationSupport: () => Promise<boolean>;
      requestNativeNotificationPermission: () => Promise<boolean>;
      onNotificationClick: (id: string, callback: () => void) => () => void;
      onNotificationAction: (id: string, callback: (action: string) => void) => () => void;
      onNotificationReply: (id: string, callback: (reply: string) => void) => () => void;
    };
  }
}
