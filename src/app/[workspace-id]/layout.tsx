import { ReactNode } from 'react';
import { ServerLayout } from './server-layout';
import { WorkspaceIdClientLayout } from './client-layout';

interface WorkspaceIdLayoutProps {
  children: ReactNode;
  params: Promise<{ 'workspace-id': string }>;
}

export default async function WorkspaceIdLayout({ children, params }: WorkspaceIdLayoutProps) {
  const { 'workspace-id': workspaceId } = await params;

  return (
    <ServerLayout workspaceId={workspaceId}>
      <WorkspaceIdClientLayout>
        {children}
      </WorkspaceIdClientLayout>
    </ServerLayout>
  );
}