'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { isElectron, navigateToUrl } from '@/lib/electron/navigation';

export function ElectronRedirectHandler() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isElectron()) return;

    // Override fetch to intercept redirects in Electron
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      // Check for Electron redirect header
      const redirectUrl = response.headers.get('X-Electron-Redirect');
      if (redirectUrl && response.status >= 300 && response.status < 400) {
        // Handle the redirect using window.location for better Electron compatibility
        setTimeout(() => {
          navigateToUrl(redirectUrl);
        }, 100);
      }

      return response;
    };

    // Cleanup on unmount
    return () => {
      window.fetch = originalFetch;
    };
  }, [router]);

  // Also handle navigation events in Electron
  useEffect(() => {
    if (!isElectron()) return;

    // Intercept router navigation in Electron for better handling
    const handlePopState = (event: PopStateEvent) => {
      // Force a full page reload for history navigation in Electron
      if (event.state) {
        window.location.reload();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [pathname]);

  return null; // This component doesn't render anything
}
