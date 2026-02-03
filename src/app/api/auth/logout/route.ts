import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST() {
    cookies().delete('session_token');
    return NextResponse.json({ message: 'Ausgeloggt' }, { status: 200 });
}
