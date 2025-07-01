"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { toast } from "sonner";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { useCreateWorkspace } from "@/features/workspaces";
import { useFileUpload } from "@/features/file-upload";
import { useParamIds } from "@/hooks/use-param-ids";
import { useInviteLink } from "@/features/auth/hooks/use-auth-mutations";

const steps = ["Workspace Name", "Your Profile", "Invite Teammates"];

export default function CreateWorkspacePage() {
  const router = useRouter();
  const { workspaceId } = useParamIds();
  const [step, setStep] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [createdWorkspaceId, setCreatedWorkspaceId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 1: Workspace name
  const workspaceForm = useForm({
    defaultValues: { name: "" },
    mode: "onChange",
  });
  // Step 2: User profile
  const profileForm = useForm({
    defaultValues: { displayName: "", avatar: "" },
    mode: "onChange",
  });

  const { mutateAsync: createWorkspace, isPending: isCreating } =
    useCreateWorkspace();

  const uploadFileMutation = useFileUpload(workspaceId);
  const inviteLinkMutation = useInviteLink();

  // Generate invite link when we reach step 3 and have a workspace
  useEffect(() => {
    if (step === 2 && createdWorkspaceId) {
      console.log("Generating invite link for workspace:", createdWorkspaceId);
      inviteLinkMutation.mutate(createdWorkspaceId);
    }
  }, [step, createdWorkspaceId]);

  // Debug logging
  useEffect(() => {
    if (inviteLinkMutation.data) {
      console.log("Invite link data:", inviteLinkMutation.data);
    }
    if (inviteLinkMutation.error) {
      console.error("Invite link error:", inviteLinkMutation.error);
    }
  }, [inviteLinkMutation.data, inviteLinkMutation.error]);

  // Stepper UI
  function Stepper() {
    return (
      <div className="flex justify-center gap-4 mb-8">
        {steps.map((label, idx) => (
          <div key={label} className="flex flex-col items-center">
            <div
              className={`rounded-full w-8 h-8 flex items-center justify-center font-bold ${
                step === idx
                  ? "bg-primary text-primary-foreground"
                  : step > idx
                  ? "bg-green-500"
                  : "bg-muted"
              }`}
            >
              {idx + 1}
            </div>
            <span
              className={`mt-2 text-xs ${
                step === idx ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
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
                This is what your team will see everywhere. Make it short,
                clear, and memorable.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={workspaceForm.control}
                name="name"
                rules={{
                  required: "Workspace name is required",
                  minLength: { value: 3, message: "At least 3 characters" },
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
            </CardContent>
            <CardFooter className="justify-end">
              <Button
                onClick={async () => {
                  const valid = await workspaceForm.trigger();
                  if (valid) setStep(1);
                }}
                disabled={isCreating}
              >
                Next
              </Button>
            </CardFooter>
          </Card>
        </Form>
      </FormProvider>
    );
  }

  // Step 2: User Profile
  // async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
  //   const file = e.target.files?.[0];
  //   if (!file) return;
  //   setIsUploading(true);
  //   try {
  //     const { url, key } = await uploadUrlMutation.mutateAsync({
  //       fileName: file.name,
  //       fileType: file.type,
  //     });
  //     await uploadFileMutation.mutateAsync({ url, file });
  //     // Construct public URL from key
  //     const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  //     const bucket = "avatars"; // Change if your bucket is named differently
  //     const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${key}`;
  //     setAvatarUrl(publicUrl);
  //     profileForm.setValue("avatar", publicUrl);
  //   } catch (err) {
  //     toast.error("Failed to upload image");
  //   } finally {
  //     setIsUploading(false);
  //   }
  // }

  function UserProfileStep() {
    const handleNext = async () => {
      const valid = await profileForm.trigger();
      if (valid) {
        try {
          const name = workspaceForm.getValues("name");
          const workspace = await createWorkspace({ name });
          setCreatedWorkspaceId(workspace.id);
          toast.success("Workspace created successfully!");
          setStep(2);
        } catch (err) {
          toast.error("Failed to create workspace");
        }
      }
    };

    return (
      <FormProvider {...profileForm}>
        <Form {...profileForm}>
          <Card className="max-w-md mx-auto w-full">
            <CardHeader>
              <CardTitle>Who are you?</CardTitle>
              <CardDescription>
                Tell your teammates what to call you. You can also add a photo
                so people know it's you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={profileForm.control}
                name="displayName"
                rules={{
                  required: "Your name is required",
                  minLength: { value: 2, message: "At least 2 characters" },
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
                <div
                  className="cursor-pointer"
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  tabIndex={0}
                  role="button"
                  aria-label="Upload profile photo"
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && !isUploading)
                      fileInputRef.current?.click();
                  }}
                >
                  <Avatar className="w-20 h-20">
                    {avatarUrl ? (
                      <AvatarImage src={avatarUrl} />
                    ) : (
                      <AvatarFallback>
                        {profileForm
                          .watch("displayName")
                          ?.trim()
                          .charAt(0)
                          .toUpperCase() || ""}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </div>
                {/* <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleAvatarUpload}
                  disabled={isUploading}
                /> */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? "Uploading..." : "Upload a photo"}
                </Button>
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <Button
                variant="ghost"
                onClick={() => setStep(0)}
                disabled={isCreating}
              >
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={isCreating}
              >
                {isCreating ? "Creating workspace..." : "Next"}
              </Button>
            </CardFooter>
          </Card>
        </Form>
      </FormProvider>
    );
  }

  // Step 3: Invite Teammates (Link only)
  function InviteTeammatesStep() {
    const handleCopy = () => {
      const url = inviteLinkMutation.data?.url;
      if (!url) return;
      navigator.clipboard
        .writeText(url)
        .then(() => toast.success("Invite link copied to clipboard!"));
    };

    const handleFinish = () => {
      if (createdWorkspaceId) {
        router.push(`/${createdWorkspaceId}`);
      }
    };

    return (
      <Card className="max-w-md mx-auto w-full">
        <CardHeader>
          <CardTitle>Invite your teammates</CardTitle>
          <CardDescription>
            Share this link with your teammates to invite them to your workspace.
            You can always invite more people later from your workspace settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full flex flex-col gap-2">
            <Label>Share this link</Label>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleCopy}
            >
              Copy Invite Link
            </Button>
          </div>
        </CardContent>
        <CardFooter className="justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep(1)}
            disabled={isCreating}
          >
            Back
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleFinish}
            >
              Skip
            </Button>
            <Button
              onClick={handleFinish}
            >
              Finish
            </Button>
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
      {step === 2 && (
        inviteLinkMutation.data?.url ? (
          <InviteTeammatesStep />
        ) : (
          <Card className="max-w-md mx-auto w-full">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">Generating invite link...</p>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
