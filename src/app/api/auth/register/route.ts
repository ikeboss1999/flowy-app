import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { hashPassword, generateVerificationCode } from '@/lib/auth';
import { User, VerificationToken } from '@/lib/types';
import { nanoid } from 'nanoid';

const registerSchema = z.object({
    email: z.string().email('Ungültige E-Mail-Adresse'),
    password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen lang sein'),
    name: z.string().min(2, 'Name muss mindestens 2 Zeichen lang sein'),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const result = registerSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { message: 'Validierungsfehler', errors: result.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { email, password, name } = result.data;

        // Check if user exists
        if (db.findUserByEmail(email)) {
            return NextResponse.json(
                { message: 'Diese E-Mail-Adresse wird bereits verwendet.' },
                { status: 409 }
            );
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Create user
        const newUser: User = {
            id: nanoid(),
            email,
            passwordHash,
            name,
            role: 'user', // Default role
            isVerified: true, // Auto-verified
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        db.addUser(newUser);

        // No token generation needed for auto-verified users

        return NextResponse.json(
            { message: 'Registrierung erfolgreich. Sie können sich nun einloggen.' },
            { status: 201 }
        );
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { message: 'Interner Server-Fehler' },
            { status: 500 }
        );
    }
}
