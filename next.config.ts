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
  // Headers de segurança
  async headers() {
    return [
      {
        // Aplicar a todas as rotas
        source: '/(.*)',
        headers: [
          // Previne clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          // Previne MIME sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          // Controla referrer
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          // Previne ataques XSS
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          // HSTS - força HTTPS
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          },
          // Content Security Policy básica
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co; frame-ancestors 'none';"
          }
        ],
      },
    ];
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
