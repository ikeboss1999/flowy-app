import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { nanoid } from 'nanoid';
import { getUserSession } from '@/lib/auth-server';
import { encrypt, decrypt } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const session = await getUserSession();
    const userId = session?.userId;

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const client = supabaseAdmin || supabase;
        const { data: credentials, error } = await client
            .from('credentials')
            .select('*')
            .eq('userId', userId)
            .order('title', { ascending: true });

        if (error) throw error;

        // Decrypt password on the fly
        const decryptedCredentials = (credentials || []).map(cred => {
            try {
                return {
                    ...cred,
                    password: cred.password ? decrypt(cred.password) : ''
                };
            } catch (decryptionError) {
                console.error(`Failed to decrypt password for credential ID: ${cred.id}`, decryptionError);
                return {
                    ...cred,
                    password: '[DECRYPTION_ERROR]'
                };
            }
        });

        return NextResponse.json(decryptedCredentials);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getUserSession();
    const userId = session?.userId;

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const payload = await request.json();
        const cred = payload.credential || payload;
        const credId = cred.id || nanoid();
        const now = new Date().toISOString();

        // Encrypt the password
        const encryptedPassword = cred.password ? encrypt(cred.password) : '';

        const client = supabaseAdmin || supabase;
        const result = await client
            .from('credentials')
            .upsert({
                id: credId,
                title: cred.title,
                url: cred.url || '',
                username: cred.username,
                password: encryptedPassword,
                notes: cred.notes || '',
                tags: cred.tags || [],
                userId,
                updatedAt: now
            });

        if (result.error) {
            console.error('SUPABASE UPSERT ERROR:', result.error);
            throw result.error;
        }

        return NextResponse.json({ success: true, id: credId });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getUserSession();
    const userId = session?.userId;

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    try {
        const client = supabaseAdmin || supabase;
        const { error } = await client.from('credentials').delete().eq('id', id).eq('userId', userId);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
