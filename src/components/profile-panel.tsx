'use client';

import { Profile } from '@/features/members/components/profile';
import { useUIStore } from '@/stores/ui-store';

export const ProfilePanel = () => {
  const { profileMemberId, setProfilePanelOpen } = useUIStore();

  const handleClose = () => {
    setProfilePanelOpen(null);
  };

  if (!profileMemberId) {
    return null;
  }

  return (
    <div className="h-full flex flex-col bg-background border-l border-border-subtle">
      <Profile memberId={profileMemberId} onClose={handleClose} />
    </div>
  );
};
