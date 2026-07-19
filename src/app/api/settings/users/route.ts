import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserSession } from '@/lib/auth-server';
import { wipeAccount } from '@/lib/account-wipe';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;

    if (!companyOwnerId || (session?.role !== 'admin' && session?.role !== 'developer')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const client = supabaseAdmin || supabase;
        const { data: roles, error } = await client
            .from('user_roles')
            .select('*')
            .eq('company_owner_id', companyOwnerId);

        if (error) throw error;

        let usersWithDetails = [...(roles || [])];

        if (supabaseAdmin) {
            try {
                // Paginate or list users
                const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
                if (!authError && users) {
                    const userMap = new Map(users.map(u => [u.id, u]));
                    usersWithDetails = roles.map(role => {
                        const authUser = userMap.get(role.user_id);
                        return {
                            ...role,
                            email: authUser?.email || 'Mitarbeiter',
                            name: authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || 'Mitarbeiter'
                        };
                    });
                }
            } catch (authErr) {
                console.error('[UsersAPI] Failed to fetch auth details:', authErr);
            }
        }

        return NextResponse.json(usersWithDetails);
    } catch (e) {
        console.error('[UsersAPI] GET failed:', e);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;

    if (!companyOwnerId || (session?.role !== 'admin' && session?.role !== 'developer')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Service Role Key configuration is missing' }, { status: 500 });
    }

    try {
        const { email, name, role, permissions } = await request.json();

        if (!email || !role) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const isDevelopment = process.env.NODE_ENV === 'development';

        // Calculate redirect URL: Force localhost in dev mode, else use request origin or fallback to production URL
        let redirectOrigin = new URL(request.url).origin;

        if (isDevelopment) {
            redirectOrigin = 'http://localhost:3000';
        } else {
            // If in production but request origin is localhost, fallback to official Vercel app
            if (redirectOrigin.includes('localhost')) {
                redirectOrigin = 'https://flowyapp.vercel.app';
            }
        }

        if (isDevelopment) {
            console.log('[DEBUG-API] Resolved redirectOrigin:', redirectOrigin);
            console.log('[DEBUG-API] Full redirectTo passed to Supabase:', `${redirectOrigin}/auth/callback`);
        }

        let newUser;

        if (isDevelopment) {
            // In dev mode, generate link directly to prevent email provider/scanner auto-consumption
            const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                type: 'invite',
                email,
                options: {
                    data: { full_name: name },
                    redirectTo: `${redirectOrigin}/auth/callback`
                }
            });

            if (linkError) {
                if (linkError.message.includes('already registered') || linkError.status === 422) {
                    return NextResponse.json({ error: 'Diese E-Mail ist bereits registriert.' }, { status: 400 });
                }
                throw linkError;
            }

            newUser = linkData.user;

            if (linkData?.properties?.action_link) {
                const urlObj = new URL(linkData.properties.action_link);
                urlObj.searchParams.set('redirect_to', `${redirectOrigin}/auth/callback`);
                console.log('\n==================================================');
                console.log('[DEBUG] AKTIVIERUNGS-LINK FÜR EINLADUNG:');
                console.log(urlObj.toString());
                console.log('==================================================\n');
            }
        } else {
            // In production, send invite normally via email
            const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
                data: { full_name: name },
                redirectTo: `${redirectOrigin}/auth/callback`
            });

            if (inviteError) {
                if (inviteError.message.includes('already registered') || inviteError.status === 422) {
                    return NextResponse.json({ error: 'Diese E-Mail ist bereits registriert.' }, { status: 400 });
                }
                throw inviteError;
            }

            newUser = inviteData.user;
        }

        // 2. Insert into user_roles
        const { error: dbError } = await supabaseAdmin
            .from('user_roles')
            .insert({
                user_id: newUser.id,
                company_owner_id: companyOwnerId,
                role: role,
                permissions: permissions || {},
                status: 'pending',
                invited_by: session.userId
            });

        if (dbError) throw dbError;

        return NextResponse.json({ success: true, user: newUser });
    } catch (e: any) {
        console.error('[UsersAPI] POST failed:', e);
        return NextResponse.json({ error: e.message || 'Failed to invite user' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;

    if (!companyOwnerId || (session?.role !== 'admin' && session?.role !== 'developer')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { userId, role, permissions } = await request.json();

        if (!userId || !role) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Prevent admin from removing their own admin role
        if (userId === session.userId && role !== session.role) {
            return NextResponse.json({ error: 'Sie können Ihre eigene Rolle nicht ändern.' }, { status: 400 });
        }

        const client = supabaseAdmin || supabase;
        const { error } = await client
            .from('user_roles')
            .update({
                role,
                permissions
            })
            .eq('user_id', userId)
            .eq('company_owner_id', companyOwnerId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('[UsersAPI] PUT failed:', e);
        return NextResponse.json({ error: 'Failed to update user permissions' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;

    if (!companyOwnerId || (session?.role !== 'admin' && session?.role !== 'developer')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Service Role Key configuration is missing' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    if (userId === session.userId) {
        return NextResponse.json({ error: 'Sie können Ihren eigenen Zugang nicht löschen.' }, { status: 400 });
    }

    try {
        // Verify that the user being deleted belongs to the caller's company
        const { data: targetUserRole } = await supabaseAdmin
            .from('user_roles')
            .select('company_owner_id')
            .eq('user_id', userId)
            .maybeSingle();

        if (!targetUserRole || targetUserRole.company_owner_id !== companyOwnerId) {
            return NextResponse.json({ error: 'Nicht autorisiert (Benutzer gehört nicht zu Ihrer Firma).' }, { status: 403 });
        }

        const result = await wipeAccount(userId);

        if (!result.success) {
            return NextResponse.json({ error: result.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('[UsersAPI] DELETE failed:', e);
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}
