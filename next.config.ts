import type { NextConfig } from 'next';

const isElectron = process.env.ELECTRON === 'true';

const nextConfig: NextConfig = {
  devIndicators: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
  output: 'standalone',
  experimental: {},
  images: {
    unoptimized: isElectron,
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
  webpack: (config, { dev, isServer }) => {
    if (isElectron) {
      config.externals = config.externals || [];
      config.externals.push({
        sharp: 'commonjs sharp',
        canvas: 'commonjs canvas',
      });
    }

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
    }

    config.module.rules.push({
      test: /\.node$/,
      use: 'node-loader',
    });

    return config;
  },
  async headers() {
    const headers = [
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

    if (isElectron) {
      headers.unshift({
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: http: https:",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://vitals.vercel-insights.com",
              "connect-src 'self' http://127.0.0.1:8081 http://localhost:8081 https://ypkobnsdgcclemmiswkj.supabase.co wss://ypkobnsdgcclemmiswkj.supabase.co https://m7vs6bfljtuvekta2gw27tyg2a0iwdqz.lambda-url.us-east-2.on.aws https://va.vercel-scripts.com https://vitals.vercel-insights.com",
              "img-src 'self' data: blob: https: http:",
              "style-src 'self' 'unsafe-inline' https:",
              "font-src 'self' data: https:",
              "frame-src 'self' https:",
              "worker-src 'self' blob:",
            ].join('; '),
          },
        ],
      });
    }

    return headers;
  },
};

export default nextConfig;
