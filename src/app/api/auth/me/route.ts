import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
    const token = cookies().get('session_token')?.value;

    if (!token) {
        console.warn('Session check: No session_token found in cookies');
        return NextResponse.json({ user: null }, { status: 200 });
    }

    const payload = await verifySessionToken(token);

    if (!payload) {
        return NextResponse.json({ user: null }, { status: 200 });
    }

    // Refresh user data from DB (in case role/name changed)
    const user = db.findUserById(payload.userId);

    if (!user) {
        return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        }
    }, { status: 200 });
}
