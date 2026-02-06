import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: Request) {
    try {
        const token = cookies().get('session_token')?.value;

        if (!token) {
            return NextResponse.json({ message: 'Nicht authentifiziert' }, { status: 401 });
        }

        const payload = await verifySessionToken(token);
        if (!payload) {
            return NextResponse.json({ message: 'Ungültige Sitzung' }, { status: 401 });
        }

        const data = await req.json();
        const { email } = data;

        // Basic validation
        if (email && !email.includes('@')) {
            return NextResponse.json({ message: 'Ungültige E-Mail-Adresse' }, { status: 400 });
        }

        // Check if email is already taken (if changing email)
        if (email) {
            const existingUser = db.findUserByEmail(email);
            if (existingUser && existingUser.id !== payload.userId) {
                return NextResponse.json({ message: 'Diese E-Mail-Adresse wird bereits verwendet' }, { status: 400 });
            }
        }

        const updatedUser = db.updateUser(payload.userId, {
            ...(email && { email }),
            // Add other fields here if needed later
        });

        if (!updatedUser) {
            return NextResponse.json({ message: 'Benutzer nicht gefunden' }, { status: 404 });
        }

        return NextResponse.json({
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role
            }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        return NextResponse.json({ message: 'Interner Serverfehler' }, { status: 500 });
    }
}
