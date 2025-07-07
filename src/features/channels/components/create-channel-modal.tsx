import { useRouter } from 'next/navigation';
import { type ChangeEvent, type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useWorkspaceId } from '@/hooks/use-workspace-id';
import { useCreateChannel } from '..';
import { useCreateChannelModal } from '../store/use-create-channel-modal';
import { toast } from 'sonner';
import { RadioGroup } from '@/components/ui/radio-group';
import { channelsApi } from '../api/channels-api';
import { Hash, Lock } from 'lucide-react';
import { useGetMembers } from '@/features/members';
import AddMembersDialog from '@/components/add-people-to-channel-modal';
import { ChannelType } from '@/types/chat';

export const CreateChannelModal = () => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();

  const [name, setName] = useState('');
  const [step, setStep] = useState(1);
  const [channelType, setChannelType] = useState<ChannelType>(ChannelType.PUBLIC);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [inviteMode, setInviteMode] = useState<'all' | 'specific'>('specific');
  const [isAddingMembers, setIsAddingMembers] = useState(false);

  const { open, setOpen } = useCreateChannelModal();
  const { data: workspaceMembers = [] } = useGetMembers(workspaceId || '');

  const { mutateAsync, isPending } = useCreateChannel();

  const handleClose = () => {
    setName('');
    setStep(1);
    setChannelType(ChannelType.PUBLIC);
    setSelectedMemberIds([]);
    setInviteMode('specific');
    setIsAddingMembers(false);
    setOpen(false);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s+/g, '-').toLowerCase();
    setName(value);
  };

  const handleNext = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStep(2);
  };

  const handleAddMembers = (memberIds: string[]) => {
    setSelectedMemberIds(memberIds);
    setIsAddingMembers(false);
  };

  const handleFinish = async () => {
    if (typeof workspaceId !== 'string') {
      toast.error('Workspace ID is required');
      return;
    }
    mutateAsync({
      name,
      workspaceId,
      channelType,
    })
      .then(async (channel) => {
        // Add selected members after channel creation
        let memberIdsToAdd = selectedMemberIds;
        if (inviteMode === 'all') {
          // Add all workspace members except the current user (who is added automatically)
          memberIdsToAdd = workspaceMembers.map((member) => member.id);
        }

        if (memberIdsToAdd.length > 0) {
          try {
            await channelsApi.addChannelMembers(workspaceId, channel.id, {
              memberIds: memberIdsToAdd,
            });
          } catch (err) {
            console.error('Failed to add members:', err);
            toast.error('Channel created but failed to add some members');
          }
        }

        router.push(`/${workspaceId}/c-${channel.id}`);
        handleClose();
        toast.success('Channel created');
      })
      .catch((error) => {
        console.error(error);
        toast.error('Failed to create channel');
      });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {step === 1 ? (
                'Add a channel'
              ) : (
                <span className="flex items-center gap-2">
                  Invite people to
                  {channelType === 'public' ? (
                    <Hash className="size-5 text-muted-foreground" />
                  ) : (
                    <Lock className="size-5 text-muted-foreground" />
                  )}
                  {name}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {step === 1 && (
            <form className="space-y-4" onSubmit={handleNext}>
              <div>
                <label htmlFor="channel-name" className="mb-2 block text-sm font-medium">
                  Channel name
                </label>
                <div className="relative">
                  {channelType === 'public' ? (
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
                  ) : (
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
                  )}
                  <Input
                    id="channel-name"
                    value={name}
                    onChange={handleChange}
                    disabled={isPending}
                    autoFocus
                    placeholder="example-channel"
                    required
                    minLength={3}
                    maxLength={80}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <div className="mb-2 text-sm font-medium">Channel type</div>
                <RadioGroup
                  options={[
                    {
                      label: 'Public - Anyone in the workspace can join',
                      value: ChannelType.PUBLIC,
                    },
                    {
                      label: 'Private - Only invited people can join',
                      value: ChannelType.PRIVATE,
                    },
                  ]}
                  value={channelType}
                  onChange={(val) => setChannelType(val as ChannelType)}
                  name="channel-type"
                />
              </div>
              <div className="flex justify-end">
                <Button disabled={isPending}>Next</Button>
              </div>
            </form>
          )}
          {step === 2 && (
            <>
              <div className="mb-4">
                <RadioGroup
                  options={[
                    {
                      label: 'Add all members of the workspace',
                      value: 'all',
                    },
                    { label: 'Add specific people', value: 'specific' },
                  ]}
                  value={inviteMode}
                  onChange={(val) => setInviteMode(val as 'all' | 'specific')}
                  name="invite-mode"
                />
              </div>

              {inviteMode === 'specific' && (
                <div className="space-y-4">
                  <div className="mb-2 text-sm font-medium">
                    Selected members ({selectedMemberIds.length})
                  </div>
                  <div className="space-y-2">
                    {selectedMemberIds.length > 0 ? (
                      <div className="space-y-1">
                        {selectedMemberIds.map((memberId) => {
                          const member = workspaceMembers.find((m) => m.id === memberId);
                          if (!member) {
                            return null;
                          }
                          return (
                            <div
                              key={memberId}
                              className="flex items-center justify-between p-2 bg-muted rounded-md"
                            >
                              <span className="text-sm">{member.user.name}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setSelectedMemberIds((prev) =>
                                    prev.filter((id) => id !== memberId),
                                  )
                                }
                              >
                                Remove
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No members selected</p>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => setIsAddingMembers(true)}
                      disabled={isPending}
                    >
                      Add people
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex justify-between mt-4">
                <Button variant="outline" onClick={() => setStep(1)} disabled={isPending}>
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={handleFinish} disabled={isPending}>
                    Skip for now
                  </Button>
                  <Button onClick={handleFinish} disabled={isPending}>
                    Finish
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AddMembersDialog
        isOpen={isAddingMembers}
        onClose={() => setIsAddingMembers(false)}
        channel={{
          id: '',
          name,
          isPrivate: channelType === ChannelType.PRIVATE,
          type: channelType,
          memberCount: 0,
          isDefault: false,
        }}
        onAddMembers={handleAddMembers}
        existingMemberIds={selectedMemberIds}
      />
    </>
  );
};
