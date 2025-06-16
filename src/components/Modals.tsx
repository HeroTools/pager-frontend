"use client";

import { useEffect, useState } from "react";

import { CreateChannelModal } from "@/features/channels/components/CreateChannelModal";
import { CreateWorkspaceModal } from "@/features/workspaces/components/CreateWorkspaceModal";

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
    </>
  );
};
