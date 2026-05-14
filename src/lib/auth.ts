import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';
import { nanoid } from 'nanoid';

const rawSecret = process.env.JWT_SECRET || 'flowy-local-fallback-secret-67890';
if (!process.env.JWT_SECRET) {
    console.warn('WARNING: JWT_SECRET environment variable is missing! Using local fallback secret.');
}

const JWT_SECRET = new TextEncoder().encode(rawSecret);

const rawSupabaseSecret = process.env.SUPABASE_JWT_SECRET || rawSecret;
const SUPABASE_JWT_SECRET = new TextEncoder().encode(rawSupabaseSecret);

export const hashPassword = async (password: string): Promise<string> => {
    return await bcrypt.hash(password, 12);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
    return await bcrypt.compare(password, hash);
};

export const createSessionToken = async (payload: { userId: string; email: string; role: string }) => {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h') // Session lasts 24h
        .sign(JWT_SECRET);
};

export const verifySessionToken = async (token: string) => {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as { userId: string; email: string; role: string };
    } catch (error) {
        return null;
    }
};

export const createSupabaseToken = async (payload: { employeeId: string; ownerId: string; email: string }) => {
    return await new SignJWT({
        aud: 'authenticated',
        role: 'authenticated',
        sub: payload.ownerId, // Set sub to the company owner UUID (valid UUID)
        email: payload.email,
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: { employee_id: payload.employeeId }
    })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuedAt()
        .setExpirationTime('24h') // Must match normal session duration
        .sign(SUPABASE_JWT_SECRET);
};

export { generateVerificationCode, getAuthErrorMessage } from './auth-utils';
