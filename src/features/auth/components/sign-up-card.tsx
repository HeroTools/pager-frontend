import { CheckCircle, TriangleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase/client';

import { useSignUp } from '@/features/auth';
import { getAuthErrorMessage } from '@/features/auth/utils/error-messages';
import type { AuthFlow } from '../stores/auth-store';

interface SignUpCardProps {
  onSuccess?: (workspaceId?: string) => void;
  setFlow: (flow: AuthFlow) => void;
  hideSignInLink?: boolean;
  inviteToken?: string | undefined;
}

export const SignUpCard = ({
  onSuccess,
  setFlow,
  hideSignInLink = false,
  inviteToken,
}: SignUpCardProps) => {
  const signUp = useSignUp();
  const [signingUp, setSigningUp] = useState(false);
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const router = useRouter();

  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const handlePasswordSignUp = form.handleSubmit(
    async ({ name, email, password, confirmPassword }) => {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      setSigningUp(true);
      setError('');

      try {
        const response = await signUp.mutateAsync({
          email,
          password,
          name,
          inviteToken,
        });

        if (response.requires_email_confirmation) {
          setUserEmail(email);
          setEmailSent(true);
          return;
        }

        // Session is already set by the auth API, no need to set it manually

        if (onSuccess) {
          // Use default_workspace_id or first workspace ID
          const workspaceId = response.default_workspace_id || response.workspaces?.[0]?.id;
          onSuccess(workspaceId);
        } else {
          // Smart routing based on workspaces
          if (response.workspaces && response.workspaces.length > 0) {
            const targetWorkspaceId = response.default_workspace_id || response.workspaces[0]?.id;
            router.push(`/${targetWorkspaceId}`);
          } else {
            // No workspaces - redirect to home which will handle onboarding
            router.push('/');
          }
          router.refresh();
        }
      } catch (err: any) {
        console.error('Sign up error:', err);
        setError(getAuthErrorMessage(err));
      } finally {
        setSigningUp(false);
      }
    },
  );

  const handleResendEmail = async () => {
    if (!userEmail) {
      return;
    }

    setSigningUp(true);
    setError('');

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail,
      });

      if (error) {
        setError(getAuthErrorMessage(error));
      } else {
        setError('');
        // Could show a success message here
      }
    } catch (err: any) {
      setError('Failed to resend email. Please try again.');
    } finally {
      setSigningUp(false);
    }
  };

  // Show email confirmation screen
  if (emailSent) {
    return (
      <Card className="w-full h-full p-8">
        <CardHeader className="px-0 pt-0 text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="size-12 text-brand-green" />
          </div>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We&apos;ve sent a confirmation link to <strong>{userEmail}</strong>
          </CardDescription>
        </CardHeader>
        {error && (
          <div className="bg-destructive/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-destructive mb-6">
            <TriangleAlert className="size-4" />
            <p>{error}</p>
          </div>
        )}
        <CardContent className="space-y-4 px-0 pb-0 text-center">
          <p className="text-sm text-muted-foreground">
            Click the link in the email to verify your account. If you don&apos;t see it, check your
            spam folder.
          </p>
          <div className="space-y-2">
            <Button
              onClick={handleResendEmail}
              variant="outline"
              className="w-full"
              disabled={signingUp}
            >
              {signingUp ? 'Sending...' : 'Resend email'}
            </Button>
          </div>
          {!hideSignInLink && (
            <p className="text-xs text-muted-foreground">
              Already have an account?{' '}
              <span
                onClick={() => setFlow('signIn')}
                className="text-primary hover:underline cursor-pointer"
              >
                Sign in
              </span>
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full h-full p-8">
      <CardHeader className="px-0 pt-0">
        <CardTitle>Sign up to continue</CardTitle>
      </CardHeader>
      {error && (
        <div className="bg-destructive/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-destructive mb-6">
          <TriangleAlert className="size-4" />
          <p>{error}</p>
        </div>
      )}
      <CardContent className="space-y-5 px-0 pb-0">
        <form className="space-y-2.5" onSubmit={handlePasswordSignUp}>
          <Input
            {...form.register('name', {
              required: 'Name is required',
            })}
            disabled={signingUp}
            placeholder="Full name"
          />
          {form.formState.errors.name && (
            <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
          )}
          <Input
            {...form.register('email', {
              required: 'Email is required',
              pattern: {
                value: /^\S+@\S+$/i,
                message: 'Please enter a valid email',
              },
            })}
            disabled={signingUp}
            placeholder="Email"
            type="email"
          />
          {form.formState.errors.email && (
            <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
          )}
          <Input
            {...form.register('password', {
              required: 'Password is required',
              minLength: {
                value: 6,
                message: 'Password must be at least 6 characters',
              },
            })}
            disabled={signingUp}
            placeholder="Password"
            type="password"
          />
          {form.formState.errors.password && (
            <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
          )}
          <Input
            {...form.register('confirmPassword', {
              required: 'Please confirm your password',
            })}
            disabled={signingUp}
            placeholder="Confirm password"
            type="password"
          />
          {form.formState.errors.confirmPassword && (
            <p className="text-sm text-destructive">
              {form.formState.errors.confirmPassword.message}
            </p>
          )}
          <Button type="submit" className="w-full" size="lg" disabled={signingUp}>
            {signingUp ? 'Signing up...' : 'Continue'}
          </Button>
        </form>
        {!hideSignInLink && (
          <p className="text-xs text-muted-foreground">
            Already have an account?{' '}
            <span
              onClick={() => setFlow('signIn')}
              className="text-primary hover:underline cursor-pointer"
            >
              Sign in
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
};
