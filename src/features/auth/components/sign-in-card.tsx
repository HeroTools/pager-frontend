import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useSignIn } from '@/features/auth';
import { AuthFlow } from '@/features/auth/stores/auth-store';
import { getAuthErrorMessage } from '@/features/auth/utils/error-messages';
import { TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

interface SignInCardProps {
  setFlow: (flow: AuthFlow) => void;
}

export const SignInCard = ({ setFlow }: SignInCardProps) => {
  const signIn = useSignIn();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handlePasswordSignIn = form.handleSubmit(async ({ email, password }) => {
    signIn.mutate(
      { email, password },
      {
        onSuccess: () => {
          setIsRedirecting(true);
        },
        onError: () => {
          setIsRedirecting(false);
        },
      },
    );
  });

  const isLoading = signIn.isPending || isRedirecting;
  const errorMessage = signIn.error ? getAuthErrorMessage(signIn.error) : null;

  return (
    <Card className="w-full h-full p-8">
      <CardHeader className="px-0 pt-0">
        <CardTitle>Login to continue</CardTitle>
      </CardHeader>
      {errorMessage && (
        <div className="bg-destructive/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-destructive mb-6">
          <TriangleAlert className="size-4" />
          <p>{errorMessage}</p>
        </div>
      )}
      <CardContent className="space-y-5 px-0 pb-0">
        <form className="space-y-2.5" onSubmit={handlePasswordSignIn}>
          <Input
            {...form.register('email', {
              required: 'Email is required',
              pattern: {
                value: /^\S+@\S+$/i,
                message: 'Please enter a valid email',
              },
            })}
            disabled={isLoading}
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
            disabled={isLoading}
            placeholder="Password"
            type="password"
          />
          {form.formState.errors.password && (
            <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
          )}
          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isRedirecting ? 'Redirecting...' : signIn.isPending ? 'Signing in...' : 'Continue'}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">
          Don&apos;t have an account?{' '}
          <span
            className="text-primary hover:underline cursor-pointer"
            onClick={() => setFlow('signUp')}
          >
            Sign up
          </span>
        </p>
      </CardContent>
    </Card>
  );
};
