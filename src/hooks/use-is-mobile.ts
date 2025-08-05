'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to detect if the current viewport is mobile size
 * Uses 768px breakpoint (md in Tailwind)
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    // Check if we're on the server
    if (typeof window === 'undefined') {
      return false;
    }
    // Initial check on client
    return window.innerWidth < 768;
  });

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Only run if the initial state might be wrong
    checkIsMobile();

    window.addEventListener('resize', checkIsMobile);

    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  return isMobile;
}