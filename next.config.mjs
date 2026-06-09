import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const packageJson = require('./package.json');

/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ['@react-pdf/renderer'],
    env: {
        NEXT_PUBLIC_APP_VERSION: packageJson.version,
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    typescript: {
        ignoreBuildErrors: false,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    webpack: (config) => {
        config.externals.push('better-sqlite3');
        return config;
    },
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on'
                    },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=63072000; includeSubDomains; preload'
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'SAMEORIGIN'
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff'
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin'
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=()'
                    },
                    {
                        key: 'Content-Security-Policy',
                        value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.supabase.co https://*.supabase.in; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' blob: data: https://*.supabase.co https://*.supabase.in; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co wss://*.supabase.in; frame-src 'self' blob:; worker-src 'self' blob:; frame-ancestors 'none';"
                    }
                ]
            }
        ];
    }
};

export default nextConfig;
