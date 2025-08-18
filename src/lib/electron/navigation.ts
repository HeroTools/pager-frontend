// Utility to detect if we're running in Electron
export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && 
         (window as any).electronAPI !== undefined;
};

// Enhanced navigation for Electron compatibility
export const navigateToUrl = (url: string): void => {
  if (typeof window === 'undefined') return;
  
  if (isElectron()) {
    // In Electron, use window.location for better redirect handling
    window.location.href = url;
  } else {
    // In browser, use normal navigation
    window.location.href = url;
  }
};

// Hook to detect Electron environment
export const useIsElectron = (): boolean => {
  if (typeof window === 'undefined') return false;
  return isElectron();
};