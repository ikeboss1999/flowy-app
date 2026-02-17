import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkAdmin } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const admin = await checkAdmin();
        if (!admin) {
            return NextResponse.json({ message: 'Nicht autorisiert' }, { status: 403 });
        }

        // Fetch users from Supabase if admin client available
        if (supabaseAdmin) {
            const { data, error } = await supabaseAdmin.auth.admin.listUsers();

            if (error) {
                console.error('[AdminAPI] Supabase listUsers error:', error);
            } else if (data?.users) {
                const sanitizedUsers = data.users.map(u => ({
                    id: u.id,
                    email: u.email,
                    name: u.user_metadata?.full_name || u.email?.split('@')[0],
                    role: u.user_metadata?.role || 'user',
                    createdAt: u.created_at,
                    updatedAt: u.updated_at || u.created_at,
                    isVerified: !!u.email_confirmed_at
                }));
                return NextResponse.json(sanitizedUsers);
            }
        }

        // Fallback to local DB (might be empty but prevents 500)
        console.warn('[AdminAPI] Falling back to local users database');
        const users = db.getUsers();
        const sanitizedUsers = users.map(({ passwordHash, ...user }) => user);
        return NextResponse.json(sanitizedUsers);
    } catch (error) {
        console.error('Admin Users GET error:', error);
        return NextResponse.json({ message: 'Serverfehler' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const admin = await checkAdmin();
        if (!admin) {
            return NextResponse.json({ message: 'Nicht autorisiert' }, { status: 403 });
        }

        const body = await req.json();
        const { userId, role } = body;

        if (!userId || !role) {
            return NextResponse.json({ message: 'Ungültige Daten' }, { status: 400 });
        }

        // Update in Supabase
        if (supabaseAdmin) {
            const { data: { user }, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(userId);
            if (!fetchError && user) {
                const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                    userId,
                    { user_metadata: { ...user.user_metadata, role } }
                );
                if (updateError) throw updateError;
            }
        }

        // Sync with local DB if exists
        db.updateUser(userId, { role });

        return NextResponse.json({ message: 'Benutzerrolle aktualisiert' });
    } catch (error) {
        console.error('Admin Users PATCH error:', error);
        return NextResponse.json({ message: 'Serverfehler' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const admin = await checkAdmin();
        if (!admin) {
            return NextResponse.json({ message: 'Nicht autorisiert' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ message: 'Nutzer-ID fehlt' }, { status: 400 });
        }

        if (userId === admin.userId) {
            return NextResponse.json({ message: 'Sie können sich nicht selbst löschen' }, { status: 400 });
        }

        // Delete from Supabase
        if (supabaseAdmin) {
            const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
            if (error) console.error('Supabase delete error:', error);
        }

        // Delete from local DB
        db.deleteUser(userId);

        return NextResponse.json({ message: 'Benutzer erfolgreich gelöscht' });
    } catch (error) {
        console.error('Admin Users DELETE error:', error);
        return NextResponse.json({ message: 'Serverfehler' }, { status: 500 });
    }
}
