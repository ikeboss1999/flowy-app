import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
    cookies().delete('session_token');
    return NextResponse.json({ message: 'Ausgeloggt' }, { status: 200 });
}
