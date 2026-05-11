import { NextResponse } from 'next/server';

// This endpoint is not used. The frontend registers directly via Supabase Auth.
// Kept as a stub to avoid 404 errors on any legacy clients.
export async function POST() {
    return NextResponse.json({ message: 'Bitte über Supabase-Auth registrieren.' }, { status: 410 });
}
