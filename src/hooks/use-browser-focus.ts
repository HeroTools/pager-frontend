import { useState, useEffect, useCallback, useRef } from 'react';

interface UseBrowserFocusReturn {
  isFocused: boolean;
  isTabVisible: boolean;
  lastFocusTime: number | null;
  lastBlurTime: number | null;
  focusDuration: number;
  blurDuration: number;
}

export const useBrowserFocus = (): UseBrowserFocusReturn => {
  const [isFocused, setIsFocused] = useState(true);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [lastFocusTime, setLastFocusTime] = useState<number | null>(Date.now());
  const [lastBlurTime, setLastBlurTime] = useState<number | null>(null);
  const focusStartRef = useRef<number>(Date.now());
  const blurStartRef = useRef<number | null>(null);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    const now = Date.now();
    setLastFocusTime(now);
    focusStartRef.current = now;
    blurStartRef.current = null;
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    const now = Date.now();
    setLastBlurTime(now);
    blurStartRef.current = now;
  }, []);

  const handleVisibilityChange = useCallback(() => {
    const isVisible = !document.hidden;
    setIsTabVisible(isVisible);

    // Also update focus state based on visibility
    if (isVisible && document.hasFocus()) {
      handleFocus();
    } else if (!isVisible) {
      handleBlur();
    }
  }, [handleFocus, handleBlur]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initial state
    const initialFocus = document.hasFocus();
    const initialVisibility = !document.hidden;

    setIsFocused(initialFocus);
    setIsTabVisible(initialVisibility);

    if (initialFocus) {
      focusStartRef.current = Date.now();
    } else {
      blurStartRef.current = Date.now();
    }

    // Event listeners
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Page visibility API fallback
    window.addEventListener('pageshow', handleFocus);
    window.addEventListener('pagehide', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handleFocus);
      window.removeEventListener('pagehide', handleBlur);
    };
  }, [handleFocus, handleBlur, handleVisibilityChange]);

  // Calculate durations
  const focusDuration = isFocused && focusStartRef.current ? Date.now() - focusStartRef.current : 0;

  const blurDuration = !isFocused && blurStartRef.current ? Date.now() - blurStartRef.current : 0;

  return {
    isFocused,
    isTabVisible,
    lastFocusTime,
    lastBlurTime,
    focusDuration,
    blurDuration,
  };
};
