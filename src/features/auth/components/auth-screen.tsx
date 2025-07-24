'use client';

import { SignInCard } from './sign-in-card';
import { SignUpCard } from './sign-up-card';
import { useAuthStore } from '@/features/auth/stores/auth-store';

export const AuthScreen = () => {
  const { flow, setFlow } = useAuthStore();

  return (
    <div className="h-full flex items-center justify-center bg-secondary">
      <div className="md:h-auto md:w-[432px]">
        {flow === 'signIn' ? <SignInCard setFlow={setFlow} /> : <SignUpCard setFlow={setFlow} />}
      </div>
    </div>
  );
};
