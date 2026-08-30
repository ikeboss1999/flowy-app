import bcrypt from 'bcryptjs';
import { jwtVerify } from 'jose';

const defaultWeakSecret = 'super-secret-default-key-change-this-in-production';

// Lazy initialization to avoid crashing during Vercel build (env vars may not be available at module load)
let _jwtSecret: Uint8Array | null = null;

function getJWTSecret(): Uint8Array {
    if (_jwtSecret) return _jwtSecret;

    let rawSecret = process.env.JWT_SECRET;
    const isProd = process.env.NODE_ENV === 'production';

    if (!rawSecret) {
        if (isProd) {
            throw new Error('FATAL: JWT_SECRET environment variable is missing in production!');
        }
        console.warn('[AUTH] WARNING: JWT_SECRET is missing! Generating a temporary random key for development.');
        const array = new Uint8Array(32);
        if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
            globalThis.crypto.getRandomValues(array);
        } else {
            for (let i = 0; i < 32; i++) {
                array[i] = Math.floor(Math.random() * 256);
            }
        }
        rawSecret = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    } else if (rawSecret === defaultWeakSecret || rawSecret.length < 32) {
        if (isProd) {
            throw new Error('FATAL: JWT_SECRET is using a known weak/default value or is too short (min 32 characters)!');
        }
        console.warn('[AUTH] WARNING: JWT_SECRET is using a weak or default value. Please change it in your .env.local!');
    }

    _jwtSecret = new TextEncoder().encode(rawSecret);
    return _jwtSecret;
}

export const hashPassword = async (password: string): Promise<string> => {
    return await bcrypt.hash(password, 12);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
    return await bcrypt.compare(password, hash);
};

export const verifySessionToken = async (token: string) => {
    try {
        const { payload } = await jwtVerify(token, getJWTSecret());
        return payload as { userId: string; email: string; role: string; employeeId?: string; sid?: string; iat?: number };
    } catch (error) {
        return null;
    }
};

export { generateVerificationCode, getAuthErrorMessage } from './auth-utils';
