import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('app-version'),
  
  // Add more secure API methods here as needed
  platform: process.platform,
  
  // Example: Safe method to open external links
  openExternal: (url: string) => {
    // Validate URL before sending to main process
    try {
      new URL(url);
      return ipcRenderer.invoke('open-external', url);
    } catch {
      console.error('Invalid URL provided to openExternal');
      return Promise.reject('Invalid URL');
    }
  },
});

// Types for the exposed API
declare global {
  interface Window {
    electronAPI: {
      getAppVersion: () => Promise<string>;
      platform: string;
      openExternal: (url: string) => Promise<void>;
    };
  }
}