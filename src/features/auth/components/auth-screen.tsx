'use client';

import { SignInCard } from './sign-in-card';
import { SignUpCard } from './sign-up-card';
import { useAuthStore } from '@/features/auth/stores/auth-store';

export const AuthScreen = () => {
  const { flow, setFlow } = useAuthStore();

  return (
    <div className="h-full flex items-center justify-center bg-secondary px-4">
      <div className="w-full max-w-[420px]">
        {flow === 'signIn' ? <SignInCard setFlow={setFlow} /> : <SignUpCard setFlow={setFlow} />}
      </div>
    </div>
  );
};
