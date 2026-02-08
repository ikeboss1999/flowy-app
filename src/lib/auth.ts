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

export const getAuthErrorMessage = (error: any): string => {
    if (!error) return "Ein unbekannter Fehler ist aufgetreten.";

    const message = error.message?.toLowerCase() || "";

    if (message.includes("invalid login credentials")) {
        return "Ungültige E-Mail-Adresse oder Passwort.";
    }

    if (message.includes("email not confirmed")) {
        return "Bitte bestätige zuerst deine E-Mail-Adresse.";
    }

    if (message.includes("user already registered") || message.includes("user_already_exists")) {
        return "Diese E-Mail-Adresse ist bereits registriert.";
    }

    if (message.includes("password should be at least")) {
        return "Das Passwort muss mindestens 6 Zeichen lang sein.";
    }

    if (message.includes("invalid format") || message.includes("valid email")) {
        return "Bitte gib eine gültige E-Mail-Adresse ein.";
    }

    if (message.includes("too many requests")) {
        return "Zu viele Versuche. Bitte warte einen Moment.";
    }

    if (message.includes("network error") || message.includes("failed to fetch")) {
        return "Netzwerkfehler. Bitte überprüfe deine Verbindung.";
    }

    // Default fallback
    console.warn("[Auth] Unhandled error message:", message);
    return "Fehler bei der Anmeldung. Bitte versuche es später erneut.";
};
