import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone', // This creates a minimal server bundle
  devIndicators: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true, // Always unoptimized for better compatibility
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ypkobnsdgcclemmiswkj.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'media.tenor.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/workspaces/:workspaceId/members',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=30, stale-while-revalidate=60',
          },
        ],
      },
      {
        source: '/workspaces/:workspaceId/conversations/:conversationId/messages',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
        ],
      },
      {
        source: '/workspaces/:workspaceId/channels/:channelId/messages',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
        ],
      },
    ];
  },
};
export default nextConfig;
