import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { isElectron, navigateToUrl } from '@/lib/electron/navigation';

export const useElectronNavigation = () => {
  const router = useRouter();

  const navigate = useCallback((url: string) => {
    if (isElectron()) {
      navigateToUrl(url);
    } else {
      router.push(url);
    }
  }, [router]);

  const replace = useCallback((url: string) => {
    if (isElectron()) {
      navigateToUrl(url);
    } else {
      router.replace(url);
    }
  }, [router]);

  const back = useCallback(() => {
    if (isElectron()) {
      window.history.back();
    } else {
      router.back();
    }
  }, [router]);

  const forward = useCallback(() => {
    if (isElectron()) {
      window.history.forward();
    } else {
      router.forward();
    }
  }, [router]);

  return {
    push: navigate,
    replace,
    back,
    forward,
    isElectron: isElectron(),
  };
};