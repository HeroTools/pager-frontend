'use client';

import { useEffect, useState } from 'react';

import { CreateChannelModal } from '@/features/channels';
import { CreateWorkspaceModal } from '@/features/workspaces';
import { CreateConversationModal } from '@/features/conversations';

export const Modals = () => {
  const [mounted, setMounted] = useState(false);

  // To prevent potential hydration problem, useEffect is used to force this to be a client-side component
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <CreateWorkspaceModal />
      <CreateChannelModal />
      <CreateConversationModal />
    </>
  );
};
