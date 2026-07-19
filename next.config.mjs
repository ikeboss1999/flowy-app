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
        ignoreDuringBuilds: false,
    },
    webpack: (config) => {
        config.externals.push('better-sqlite3');
        return config;
    }
};

export default nextConfig;
