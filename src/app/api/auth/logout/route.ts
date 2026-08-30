import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST() {
    const cookieStore = await cookies();
    cookieStore.delete('session_token');
    cookieStore.delete('sb-access-token');
    return NextResponse.json({ message: 'Ausgeloggt' }, { status: 200 });
}
