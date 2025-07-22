'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useInviteLink } from '@/features/auth/hooks/use-auth-mutations';
import { useCreateWorkspace } from '@/features/workspaces';

interface WorkspaceFormData {
  name: string;
  agentName: string;
}

interface ProfileFormData {
  displayName: string;
}

const steps = ['Workspace Name', 'Your Profile', 'Invite Teammates'] as const;

export default function CreateWorkspacePage() {
  const router = useRouter();
  const [step, setStep] = useState<number>(0);
  const [createdWorkspaceId, setCreatedWorkspaceId] = useState<string | null>(null);

  const workspaceForm = useForm<WorkspaceFormData>({
    defaultValues: { name: '', agentName: 'Assistant' },
    mode: 'onChange',
  });

  const profileForm = useForm<ProfileFormData>({
    defaultValues: { displayName: '' },
    mode: 'onChange',
  });

  const { mutateAsync: createWorkspace, isPending: isCreating } = useCreateWorkspace();

  const inviteLinkMutation = useInviteLink();

  useEffect(() => {
    if (step === 2 && createdWorkspaceId) {
      inviteLinkMutation.mutate(createdWorkspaceId);
    }
  }, [step, createdWorkspaceId, inviteLinkMutation]);

  useEffect(() => {
    if (inviteLinkMutation.data) {
      console.log('Invite link data:', inviteLinkMutation.data);
    }
    if (inviteLinkMutation.error) {
      console.error('Invite link error:', inviteLinkMutation.error);
    }
  }, [inviteLinkMutation.data, inviteLinkMutation.error]);

  function Stepper() {
    return (
      <div className="flex justify-center gap-4 mb-8">
        {steps.map((label, idx) => (
          <div key={label} className="flex flex-col items-center">
            <div
              className={`rounded-full w-8 h-8 flex items-center justify-center font-bold ${
                step === idx
                  ? 'bg-primary text-primary-foreground'
                  : step > idx
                    ? 'bg-green-500'
                    : 'bg-muted'
              }`}
            >
              {idx + 1}
            </div>
            <span
              className={`mt-2 text-xs ${step === idx ? 'text-primary' : 'text-muted-foreground'}`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    );
  }

  function WorkspaceNameStep() {
    const handleNext = async (): Promise<void> => {
      const valid = await workspaceForm.trigger();
      if (valid) {
        setStep(1);
      }
    };

    return (
      <FormProvider {...workspaceForm}>
        <Form {...workspaceForm}>
          <Card className="max-w-md mx-auto w-full">
            <CardHeader>
              <CardTitle>Set up your workspace</CardTitle>
              <CardDescription>
                Give your workspace and AI assistant names that your team will recognize.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={workspaceForm.control}
                name="name"
                rules={{
                  required: 'Workspace name is required',
                  minLength: { value: 3, message: 'At least 3 characters' },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Workspace Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Unowned, My Project, Homebase"
                        {...field}
                        autoFocus
                        disabled={isCreating}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={workspaceForm.control}
                name="agentName"
                rules={{
                  required: 'Agent name is required',
                  minLength: { value: 2, message: 'At least 2 characters' },
                  maxLength: { value: 100, message: 'Maximum 100 characters' },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>AI Assistant Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Assistant, Helper, Bot"
                        {...field}
                        disabled={isCreating}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="justify-end">
              <Button onClick={handleNext} disabled={isCreating}>
                Next
              </Button>
            </CardFooter>
          </Card>
        </Form>
      </FormProvider>
    );
  }

  function UserProfileStep() {
    const handleNext = async (): Promise<void> => {
      const valid = await profileForm.trigger();
      if (valid) {
        try {
          const { name, agentName } = workspaceForm.getValues();

          const workspace = await createWorkspace({
            name,
            agentName,
          });

          setCreatedWorkspaceId(workspace.id);
          toast.success('Workspace created successfully!');
          setStep(2);
        } catch (err) {
          toast.error('Failed to create workspace');
        }
      }
    };

    const handleBack = (): void => {
      setStep(0);
    };

    return (
      <FormProvider {...profileForm}>
        <Form {...profileForm}>
          <Card className="max-w-md mx-auto w-full">
            <CardHeader>
              <CardTitle>Who are you?</CardTitle>
              <CardDescription>Tell your teammates what to call you.</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={profileForm.control}
                name="displayName"
                rules={{
                  required: 'Your name is required',
                  minLength: { value: 2, message: 'At least 2 characters' },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Alex, Jamie, Sam"
                        {...field}
                        autoFocus
                        disabled={isCreating}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="mt-6 flex flex-col items-center gap-2">
                <Avatar className="w-20 h-20">
                  <AvatarFallback>
                    {profileForm.watch('displayName')?.trim().charAt(0).toUpperCase() || ''}
                  </AvatarFallback>
                </Avatar>
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="ghost" onClick={handleBack} disabled={isCreating}>
                Back
              </Button>
              <Button onClick={handleNext} disabled={isCreating}>
                {isCreating ? 'Creating workspace...' : 'Next'}
              </Button>
            </CardFooter>
          </Card>
        </Form>
      </FormProvider>
    );
  }

  function InviteTeammatesStep() {
    const handleCopy = (): void => {
      const url = inviteLinkMutation.data?.url;
      if (!url) {
        return;
      }
      navigator.clipboard
        .writeText(url)
        .then(() => toast.success('Invite link copied to clipboard!'));
    };

    const handleFinish = (): void => {
      if (createdWorkspaceId) {
        router.push(`/${createdWorkspaceId}`);
      }
    };

    const handleBack = (): void => {
      setStep(1);
    };

    return (
      <Card className="max-w-md mx-auto w-full">
        <CardHeader>
          <CardTitle>Invite your teammates</CardTitle>
          <CardDescription>
            Share this link with your teammates to invite them to your workspace. You can always
            invite more people later from your workspace settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full flex flex-col gap-2">
            <Label>Share this link</Label>
            <Button variant="outline" className="w-full" onClick={handleCopy}>
              Copy Invite Link
            </Button>
          </div>
        </CardContent>
        <CardFooter className="justify-between">
          <Button variant="ghost" onClick={handleBack} disabled={isCreating}>
            Back
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleFinish}>
              Skip
            </Button>
            <Button onClick={handleFinish}>Finish</Button>
          </div>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-12 bg-secondary">
      <Stepper />
      {step === 0 && <WorkspaceNameStep />}
      {step === 1 && <UserProfileStep />}
      {step === 2 &&
        (inviteLinkMutation.data?.url ? (
          <InviteTeammatesStep />
        ) : (
          <Card className="max-w-md mx-auto w-full">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
              <p className="text-muted-foreground">Generating invite link...</p>
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
