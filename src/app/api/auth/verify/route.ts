import { NextResponse } from 'next/server';

// This endpoint is not used. Email verification is handled directly by Supabase Auth.
// Kept as a stub to avoid 404 errors on any legacy clients.
export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({ message: 'Bitte über Supabase-Auth verifizieren.' }, { status: 410 });
}

export async function POST() {
    return NextResponse.json({ message: 'Bitte über Supabase-Auth verifizieren.' }, { status: 410 });
}
