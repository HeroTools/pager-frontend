import { type FC, useMemo, useState } from 'react';

import MemberSearchSelect from '@/components/member-search-select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { type MemberWithUser, useGetMembers } from '@/features/members';
import { useParamIds } from '@/hooks/use-param-ids';
import type { Channel } from '@/types/chat';

interface AddMembersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  channel: Channel;
  onAddMembers: (memberIds: string[]) => void;
  existingWorkspaceMemberIds: string[];
}

const AddMembersDialog: FC<AddMembersDialogProps> = ({
  isOpen,
  onClose,
  channel,
  onAddMembers,
  existingWorkspaceMemberIds,
}) => {
  const { workspaceId } = useParamIds();
  const { data: workspaceMembers = [] } = useGetMembers(workspaceId);
  const [selectedMembers, setSelectedMembers] = useState<MemberWithUser[]>([]);

  const handleSubmit = () => {
    onAddMembers(selectedMembers.map((member) => member.id));
    setSelectedMembers([]);
  };

  const otherMembers = useMemo(() => {
    return workspaceMembers.filter((member) => !existingWorkspaceMemberIds.includes(member.id));
  }, [workspaceMembers, existingWorkspaceMemberIds]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <div className="flex justify-between items-center mb-4">
          <DialogTitle className="text-xl">Add people to #{channel.name}</DialogTitle>
        </div>

        <MemberSearchSelect
          selectedMembers={selectedMembers}
          onMemberSelect={(member) => setSelectedMembers((prev) => [...prev, member])}
          onMemberRemove={(memberId) =>
            setSelectedMembers((prev) => prev.filter((m) => m.id !== memberId))
          }
          availableMembers={otherMembers}
          existingMemberIds={existingWorkspaceMemberIds}
          placeholder="ex. Nathalie, or james@acme.com"
        />

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={selectedMembers.length === 0}>
            Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddMembersDialog;
