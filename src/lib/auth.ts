import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { nanoid } from 'nanoid';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'super-secret-default-key-change-this-in-production'
);

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

export const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit number
};

export const generateVerificationToken = () => {
    return nanoid(32); // Random 32 char string
};
