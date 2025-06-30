import { useState, useEffect } from "react";

export const useBrowserFocus = () => {
  const [isFocused, setIsFocused] = useState(true);

  useEffect(() => {
    // Check initial focus state
    setIsFocused(!document.hidden && document.hasFocus());

    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);
    const handleVisibilityChange = () => {
      setIsFocused(!document.hidden && document.hasFocus());
    };

    // Listen to focus/blur events
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    // Listen to visibility changes (tab switching)
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return { isFocused };
};
