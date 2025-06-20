"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { toast } from "sonner";

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useCreateWorkspace } from "@/features/workspaces";
import { useUploadFile, useGetUploadUrl } from "@/features/upload/api/use-upload";

const steps = [
  "Workspace Name",
  "Your Profile",
  "Invite Teammates"
];

export default function CreateWorkspacePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [inviteEmails, setInviteEmails] = useState("");
  const [inviteLink] = useState(() => `${window?.location.origin}/invite/placeholder-link`);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 1: Workspace name
  const workspaceForm = useForm({
    defaultValues: { name: "" },
    mode: "onChange"
  });
  // Step 2: User profile
  const profileForm = useForm({
    defaultValues: { displayName: "", avatar: "" },
    mode: "onChange"
  });

  const { mutateAsync: createWorkspace, isPending: isCreating } = useCreateWorkspace();
  const uploadUrlMutation = useGetUploadUrl();
  const uploadFileMutation = useUploadFile();

  // Stepper UI
  function Stepper() {
    return (
      <div className="flex justify-center gap-4 mb-8">
        {steps.map((label, idx) => (
          <div key={label} className="flex flex-col items-center">
            <div className={`rounded-full w-8 h-8 flex items-center justify-center font-bold text-white ${step === idx ? 'bg-primary' : 'bg-muted-foreground'}`}>{idx + 1}</div>
            <span className={`mt-2 text-xs ${step === idx ? 'text-primary' : 'text-muted-foreground'}`}>{label}</span>
          </div>
        ))}
      </div>
    );
  }

  // Step 1: Workspace Name
  function WorkspaceNameStep() {
    return (
      <FormProvider {...workspaceForm}>
        <Form {...workspaceForm}>
          <Card className="max-w-md mx-auto w-full">
            <CardHeader>
              <CardTitle>Give your workspace a name</CardTitle>
              <CardDescription>
                This is what your team will see everywhere. Make it short, clear, and memorable.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={workspaceForm.control}
                name="name"
                rules={{ required: "Workspace name is required", minLength: { value: 3, message: "At least 3 characters" } }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Workspace Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Unowned, My Project, Homebase" {...field} autoFocus disabled={isCreating} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="justify-end">
              <Button onClick={workspaceForm.handleSubmit(() => setStep(1))} disabled={!workspaceForm.formState.isValid || isCreating}>
                Next
              </Button>
            </CardFooter>
          </Card>
        </Form>
      </FormProvider>
    );
  }

  // Step 2: User Profile
  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const { url, key } = await uploadUrlMutation.mutateAsync({ fileName: file.name, fileType: file.type });
      await uploadFileMutation.mutateAsync({ url, file });
      // Construct public URL from key
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const bucket = "avatars"; // Change if your bucket is named differently
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${key}`;
      setAvatarUrl(publicUrl);
      profileForm.setValue("avatar", publicUrl);
    } catch (err) {
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  }

  function UserProfileStep() {
    return (
      <FormProvider {...profileForm}>
        <Form {...profileForm}>
          <Card className="max-w-md mx-auto w-full">
            <CardHeader>
              <CardTitle>Who are you?</CardTitle>
              <CardDescription>
                Tell your teammates what to call you. You can also add a photo so people know it's you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={profileForm.control}
                name="displayName"
                rules={{ required: "Your name is required", minLength: { value: 2, message: "At least 2 characters" } }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Alex, Jamie, Sam" {...field} autoFocus disabled={isCreating} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="mt-6 flex flex-col items-center gap-2">
                <div
                  className="cursor-pointer"
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  tabIndex={0}
                  role="button"
                  aria-label="Upload profile photo"
                  onKeyDown={e => {
                    if ((e.key === 'Enter' || e.key === ' ') && !isUploading) fileInputRef.current?.click();
                  }}
                >
                  <Avatar className="w-20 h-20">
                    {avatarUrl ? <AvatarImage src={avatarUrl} /> : <AvatarFallback>U</AvatarFallback>}
                  </Avatar>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleAvatarUpload}
                  disabled={isUploading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? "Uploading..." : "Upload a photo"}
                </Button>
                <span className="text-xs text-muted-foreground mt-1">Make sure it's cute!</span>
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="ghost" onClick={() => setStep(0)} disabled={isCreating}>Back</Button>
              <Button onClick={profileForm.handleSubmit(() => setStep(2))} disabled={!profileForm.formState.isValid || isCreating}>Next</Button>
            </CardFooter>
          </Card>
        </Form>
      </FormProvider>
    );
  }

  // Step 3: Invite Teammates
  function InviteTeammatesStep() {
    return (
      <Card className="max-w-md mx-auto w-full">
        <CardHeader>
          <CardTitle>Invite your teammates</CardTitle>
          <CardDescription>
            Add email addresses to send invites now, or skip and do it later. You can always invite more people from your workspace settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Type emails, separated by commas"
            value={inviteEmails}
            onChange={e => setInviteEmails(e.target.value)}
            disabled={isCreating}
          />
          <div className="flex gap-2 mt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(inviteLink);
                toast.success("Invite link copied to clipboard!");
              }}
              disabled={isCreating}
            >
              Copy invite link
            </Button>
          </div>
        </CardContent>
        <CardFooter className="justify-between">
          <Button variant="ghost" onClick={() => setStep(1)} disabled={isCreating}>Back</Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                // Skip inviting, just create workspace
                await handleCreateWorkspace();
              }}
              disabled={isCreating}
            >
              Skip
            </Button>
            <Button
              onClick={async () => {
                await handleCreateWorkspace(inviteEmails);
              }}
              disabled={isCreating}
            >
              Finish
            </Button>
          </div>
        </CardFooter>
      </Card>
    );
  }

  // Final handler
  async function handleCreateWorkspace(emails?: string) {
    try {
      const name = workspaceForm.getValues("name");
      const displayName = profileForm.getValues("displayName");
      const avatar = profileForm.getValues("avatar");
      // TODO: send emails to backend if needed
      const workspaceId = await createWorkspace({ name });
      toast.success("Workspace created");
      // Optionally, update user profile with displayName/avatar here
      // Optionally, send invites here
      router.push(`/${workspaceId}`);
    } catch (err) {
      toast.error("Failed to create workspace");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-secondary py-12">
      <Stepper />
      {step === 0 && <WorkspaceNameStep />}
      {step === 1 && <UserProfileStep />}
      {step === 2 && <InviteTeammatesStep />}
    </div>
  );
}
