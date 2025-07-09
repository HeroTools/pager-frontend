import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  devIndicators: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['ypkobnsdgcclemmiswkj.supabase.co'],
  },
};
export default nextConfig;
