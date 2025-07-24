'use client';

import { CheckIcon, CopyIcon, Loader2Icon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
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
type Step = 0 | 1 | 2;

const STEPS = [
  { id: 0, label: 'Workspace Name', description: 'Set up workspace details' },
  { id: 1, label: 'Your Profile', description: 'Tell us about yourself' },
  { id: 2, label: 'Invite Teammates', description: 'Share your workspace' },
] as const;

const StepIndicator = ({ currentStep }: { currentStep: Step }) => (
  <div className="mb-8">
    <div className="flex items-center justify-center gap-4 mb-4">
      {STEPS.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div
            className={`
                relative flex h-10 w-10 items-center justify-center rounded-full border-2
                transition-all duration-200 ease-in-out
                ${
                  currentStep === index
                    ? 'border-primary bg-primary text-primary-foreground shadow-lg scale-110'
                    : currentStep > index
                      ? 'border-accent-success bg-accent-success text-white'
                      : 'border-muted-foreground/30 bg-background text-muted-foreground'
                }
              `}
          >
            {currentStep > index ? (
              <CheckIcon className="h-5 w-5" />
            ) : (
              <span className="text-sm font-semibold">{index + 1}</span>
            )}
          </div>
          {index < STEPS.length - 1 && (
            <div
              className={`
                  ml-4 h-0.5 w-16 transition-colors duration-200
                  ${currentStep > index ? 'bg-accent-success' : 'bg-muted-foreground/30'}
                `}
            />
          )}
        </div>
      ))}
    </div>
    <div className="text-center">
      <h2 className="text-lg font-semibold text-foreground">{STEPS[currentStep].label}</h2>
      <p className="text-sm text-muted-foreground mt-1">{STEPS[currentStep].description}</p>
    </div>
  </div>
);

const WorkspaceStep = ({
  form,
  onSubmit,
  isLoading,
}: {
  form: UseFormReturn<WorkspaceFormData>;
  onSubmit: () => void;
  isLoading: boolean;
}) => (
  <Form {...form}>
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <Card className="w-full max-w-md mx-auto shadow-lg border-0 bg-card">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-xl">Set up your workspace</CardTitle>
          <CardDescription className="text-base">
            Give your workspace and AI assistant names that your team will recognize.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            rules={{
              required: 'Workspace name is required',
              minLength: { value: 3, message: 'Name must be at least 3 characters' },
              maxLength: { value: 50, message: 'Name must be less than 50 characters' },
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Workspace Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g. Acme Inc, My Project, Team Alpha"
                    disabled={isLoading}
                    className="h-11"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="agentName"
            rules={{
              required: 'Agent name is required',
              minLength: { value: 2, message: 'Name must be at least 2 characters' },
              maxLength: { value: 30, message: 'Name must be less than 30 characters' },
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">AI Assistant Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g. Assistant, Helper, Alex"
                    disabled={isLoading}
                    className="h-11"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
        <CardFooter className="pt-6">
          <Button type="submit" disabled={isLoading} className="w-full h-11" size="lg">
            Continue
          </Button>
        </CardFooter>
      </Card>
    </form>
  </Form>
);

const ProfileStep = ({
  form,
  onSubmit,
  onBack,
  isLoading,
  isCreating,
  userInitial,
}: {
  form: UseFormReturn<ProfileFormData>;
  onSubmit: () => void;
  onBack: () => void;
  isLoading: boolean;
  isCreating: boolean;
  userInitial: string;
}) => (
  <Form {...form}>
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <Card className="w-full max-w-md mx-auto shadow-lg border-0 bg-card">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-xl">Who are you?</CardTitle>
          <CardDescription className="text-base">
            Tell your teammates what to call you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <Avatar className="h-20 w-20 border-4 border-muted">
              <AvatarFallback className="text-xl font-semibold bg-primary/10 text-primary">
                {userInitial}
              </AvatarFallback>
            </Avatar>
          </div>
          <FormField
            control={form.control}
            name="displayName"
            rules={{
              required: 'Your name is required',
              minLength: { value: 2, message: 'Name must be at least 2 characters' },
              maxLength: { value: 50, message: 'Name must be less than 50 characters' },
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Your Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g. Alex Smith, Jamie Chen"
                    disabled={isLoading}
                    className="h-11 text-center"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
        <CardFooter className="flex gap-3 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isLoading}
            className="flex-1 h-11"
          >
            Back
          </Button>
          <Button type="submit" disabled={isLoading} className="flex-1 h-11">
            {isCreating && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
            {isCreating ? 'Creating...' : 'Continue'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  </Form>
);

const InviteStep = ({
  inviteLink,
  onCopy,
  isCopied,
  onBack,
  onFinish,
  onSkip,
  isLoading,
}: {
  inviteLink: string | undefined;
  onCopy: () => void;
  isCopied: boolean;
  onBack: () => void;
  onFinish: () => void;
  onSkip: () => void;
  isLoading: boolean;
}) => {
  if (!inviteLink) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-lg border-0 bg-card">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2Icon className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Generating invite link...</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-0 bg-card">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl">Invite your teammates</CardTitle>
        <CardDescription className="text-base">
          Share this link with your teammates to invite them to your workspace. You can always
          invite more people later.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Label className="text-sm font-medium">Invite Link</Label>
        <Button
          variant="outline"
          onClick={onCopy}
          className="w-full h-11 justify-start gap-2 font-mono text-xs"
          disabled={!inviteLink}
        >
          {isCopied ? (
            <CheckIcon className="h-4 w-4 text-accent-success" />
          ) : (
            <CopyIcon className="h-4 w-4" />
          )}
          <span className="truncate">{inviteLink || 'Generating...'}</span>
        </Button>
      </CardContent>
      <CardFooter className="flex gap-3 pt-6">
        <Button variant="outline" onClick={onBack} disabled={isLoading} className="flex-1 h-11">
          Back
        </Button>
        <Button variant="outline" onClick={onSkip} className="flex-1 h-11">
          Skip for now
        </Button>
        <Button onClick={onFinish} className="flex-1 h-11">
          Finish
        </Button>
      </CardFooter>
    </Card>
  );
};

export default function CreateWorkspacePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>(0);
  const [createdWorkspaceId, setCreatedWorkspaceId] = useState<string | null>(null);
  const [isLinkCopied, setIsLinkCopied] = useState(false);

  const workspaceForm = useForm<WorkspaceFormData>({
    defaultValues: { name: '', agentName: 'Assistant' },
    mode: 'onBlur',
  });
  const { trigger: triggerWorkspace, getValues, setFocus: setWorkspaceFocus } = workspaceForm;

  const profileForm = useForm<ProfileFormData>({
    defaultValues: { displayName: '' },
    mode: 'onChange',
  });
  const { trigger: triggerProfile, watch: watchProfile, setFocus: setProfileFocus } = profileForm;

  const { mutateAsync: createWorkspace, isPending: isCreatingWorkspace } = useCreateWorkspace();
  const {
    mutate: generateInviteLink,
    data: inviteLinkData,
    isPending: isGeneratingLink,
  } = useInviteLink();

  const isLoading = isCreatingWorkspace || isGeneratingLink;

  useEffect(() => {
    if (currentStep === 0) setWorkspaceFocus('name');
    else if (currentStep === 1) setProfileFocus('displayName');
  }, [currentStep, setWorkspaceFocus, setProfileFocus]);

  useEffect(() => {
    if (currentStep === 2 && createdWorkspaceId && !inviteLinkData && !isGeneratingLink) {
      generateInviteLink(createdWorkspaceId);
    }
  }, [currentStep, createdWorkspaceId, inviteLinkData, isGeneratingLink, generateInviteLink]);

  const navigateToStep = useCallback((step: Step) => {
    setCurrentStep(step);
  }, []);

  const handleWorkspaceSubmit = useCallback(async () => {
    if (await triggerWorkspace()) navigateToStep(1);
  }, [triggerWorkspace, navigateToStep]);

  const handleProfileSubmit = useCallback(async () => {
    if (!(await triggerProfile())) return;
    try {
      const { name, agentName } = getValues();
      const workspace = await createWorkspace({ name, agentName });
      setCreatedWorkspaceId(workspace.id);
      toast.success('Workspace created successfully!');
      navigateToStep(2);
    } catch {
      toast.error('Failed to create workspace. Please try again.');
    }
  }, [triggerProfile, getValues, createWorkspace, navigateToStep]);

  const handleCopyInviteLink = useCallback(async () => {
    const url = inviteLinkData?.url;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setIsLinkCopied(true);
      toast.success('Invite link copied!');
      setTimeout(() => setIsLinkCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  }, [inviteLinkData?.url]);

  const handleFinish = useCallback(() => {
    if (createdWorkspaceId) router.push(`/${createdWorkspaceId}`);
  }, [createdWorkspaceId, router]);

  const userInitial = useMemo(() => {
    const n = watchProfile('displayName')?.trim();
    return n ? n.charAt(0).toUpperCase() : '';
  }, [watchProfile]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background to-muted/20">
      <div className="w-full max-w-lg">
        <StepIndicator currentStep={currentStep} />
        <div className="transition-opacity duration-300 ease-in-out">
          {currentStep === 0 && (
            <WorkspaceStep
              form={workspaceForm}
              onSubmit={handleWorkspaceSubmit}
              isLoading={isLoading}
            />
          )}
          {currentStep === 1 && (
            <ProfileStep
              form={profileForm}
              onSubmit={handleProfileSubmit}
              onBack={() => navigateToStep(0)}
              isLoading={isLoading}
              isCreating={isCreatingWorkspace}
              userInitial={userInitial}
            />
          )}
          {currentStep === 2 && (
            <InviteStep
              inviteLink={inviteLinkData?.url}
              onCopy={handleCopyInviteLink}
              isCopied={isLinkCopied}
              onBack={() => navigateToStep(1)}
              onFinish={handleFinish}
              onSkip={handleFinish}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}
