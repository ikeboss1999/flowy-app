import { NextResponse } from 'next/server';
import { checkAdmin } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const admin = await checkAdmin();
        if (!admin) {
            return NextResponse.json({ message: 'Nicht autorisiert' }, { status: 403 });
        }

        if (!supabaseAdmin) {
            return NextResponse.json({ message: 'Admin-Client nicht konfiguriert' }, { status: 503 });
        }

        const { data, error } = await supabaseAdmin.auth.admin.listUsers();
        if (error) throw error;

        const sanitizedUsers = (data?.users || []).map(u => ({
            id: u.id,
            email: u.email,
            name: u.user_metadata?.full_name || u.email?.split('@')[0],
            role: u.app_metadata?.role || u.user_metadata?.role || 'user',
            createdAt: u.created_at,
            updatedAt: u.updated_at || u.created_at,
            isVerified: !!u.email_confirmed_at
        }));

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

        if (!supabaseAdmin) {
            return NextResponse.json({ message: 'Admin-Client nicht konfiguriert' }, { status: 503 });
        }

        const { data: { user }, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (fetchError || !user) throw fetchError || new Error('User not found');

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { 
                app_metadata: { ...user.app_metadata, role },
                user_metadata: { ...user.user_metadata, role } 
            }
        );
        if (updateError) throw updateError;

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

        if (!supabaseAdmin) {
            return NextResponse.json({ message: 'Admin-Client nicht konfiguriert' }, { status: 503 });
        }

        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (error) throw error;

        return NextResponse.json({ message: 'Benutzer erfolgreich gelöscht' });
    } catch (error) {
        console.error('Admin Users DELETE error:', error);
        return NextResponse.json({ message: 'Serverfehler' }, { status: 500 });
    }
}
