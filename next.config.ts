import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  compiler: {
    // Remove console.* in production builds, keeping error/warn
    removeConsole: { exclude: ["error", "warn"] },
  },
  eslint: {
    // Permite que o build prossiga mesmo com erros de ESLint (necessário para deploy de teste)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Permite que o build prossiga mesmo com erros de TypeScript (deploy de teste)
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ygzagzsnpomuukjaraid.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
};

export default nextConfig;
