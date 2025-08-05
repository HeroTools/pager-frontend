'use client';

import { SignUpCard } from '@/features/auth/components/sign-up-card';
import { useAuthStore } from '@/features/auth/stores/auth-store';
import { useWorkspaceFromInviteToken } from '@/features/workspaces/hooks/use-workspaces';
import { Loader } from 'lucide-react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

const RegisterContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitation = searchParams.get('invitation') as string;
  const [step, setStep] = useState<'signup' | 'joining' | 'joined'>('signup');
  const { setFlow } = useAuthStore();

  const {
    data: inviteInfo,
    isLoading: inviteLoading,
    error: inviteError,
  } = useWorkspaceFromInviteToken(invitation || undefined);

  const handleRegisterSuccess = (workspaceId?: string) => {
    setStep('joined');
    if (workspaceId) {
      setTimeout(() => router.replace(`/${workspaceId}`), 1500);
    } else {
      setTimeout(() => router.replace('/'), 1500);
    }
  };

  return (
    <div className="h-full flex flex-col gap-y-8 items-center justify-center p-8 rounded-lg shadow-sm bg-background">
      {/* <Image src="/logo.svg" width={60} height={60} alt="Logo" /> */}
      <div className="flex flex-col gap-y-4 items-center justify-center max-w-md">
        {inviteLoading ? (
          <Loader className="size-6 animate-spin text-muted-foreground" />
        ) : inviteError ? (
          <div className="text-destructive text-center">Invalid or expired invitation link.</div>
        ) : inviteInfo?.workspace ? (
          <div className="flex flex-col items-center gap-y-2">
            {inviteInfo.workspace.image && (
              <Image
                src={inviteInfo.workspace.image}
                width={48}
                height={48}
                alt="Workspace"
                className="rounded-full border"
              />
            )}
            <h2 className="text-xl font-semibold">{inviteInfo.workspace.name}</h2>
          </div>
        ) : null}
        <div className="flex flex-col gap-y-2 items-center justify-center">
          <h1 className="text-2xl font-bold">Join Workspace</h1>
          <p className="text-md text-muted-foreground">
            {step === 'signup'
              ? 'Create an account to join this workspace.'
              : step === 'joining'
                ? 'Joining workspace...'
                : step === 'joined'
                  ? 'Success! Redirecting to workspace...'
                  : 'Redirecting...'}
          </p>
        </div>
        {step === 'signup' && !inviteLoading && !inviteError && inviteInfo?.workspace && (
          <div className="w-full flex flex-col items-center gap-y-4">
            <SignUpCard
              hideSignInLink
              inviteToken={invitation || undefined}
              onSuccess={handleRegisterSuccess}
              setFlow={setFlow}
            />
          </div>
        )}
        {step === 'joining' && (
          <div className="w-full flex flex-col items-center gap-y-4">
            <Loader className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
};

const RegisterPage = () => {
  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center">
          <Loader className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
};

export default RegisterPage;
