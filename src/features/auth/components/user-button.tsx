'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCurrentUser } from '../hooks/use-current-user';
import { Loader, LogOutIcon } from 'lucide-react';
import { useSignOut } from '../hooks/use-auth-mutations';

interface UserButtonProps {
  workspaceId: string;
  size?: 'sm' | 'md';
}

export const UserButton = ({ workspaceId, size = 'md' }: UserButtonProps) => {
  const { user, isLoading } = useCurrentUser(workspaceId);

  const signOut = useSignOut();

  const handleSignOut = () => {
    signOut.mutate();
  };

  if (isLoading) {
    return <Loader className="size-4 animate-spin text-muted-foreground" />;
  }

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className="outline-none relative cursor-pointer">
        <Avatar
          className={`rounded-md hover:opacity-75 transition ${size === 'sm' ? 'size-8' : 'size-10'}`}
        >
          <AvatarImage className="rounded-md" alt={user.name} src={user.image} />
          <AvatarFallback className="rounded-md text-sm">
            {user.name!.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom" className="w-60">
        <DropdownMenuItem onClick={handleSignOut} className="h-10">
          <LogOutIcon className="size-4 mr-2" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
