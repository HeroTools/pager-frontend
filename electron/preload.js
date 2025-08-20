const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  fileProxy: (url, headers) => ipcRenderer.invoke('file-proxy', url, headers),
  
  // Notifications
  showNotification: (title, options) => ipcRenderer.invoke('show-notification', title, options),
  onNotificationClicked: (callback) => ipcRenderer.on('notification-clicked', callback),
  
  // Window controls
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  isDev: () => ipcRenderer.invoke('is-dev'),
  
  // External links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // Environment detection
  isElectron: true,
  platform: process.platform,
  
  // Remove listeners (cleanup)
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});

// Expose a simple environment check
contextBridge.exposeInMainWorld('isElectronApp', true);

// Add keyboard shortcuts handler
contextBridge.exposeInMainWorld('electronShortcuts', {
  // Common shortcuts
  onShortcut: (shortcut, callback) => {
    const handler = (event) => {
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
});

// Safe console access for debugging
contextBridge.exposeInMainWorld('electronLog', {
  info: (...args) => console.log('[Electron]', ...args),
  warn: (...args) => console.warn('[Electron]', ...args),
  error: (...args) => console.error('[Electron]', ...args),
});