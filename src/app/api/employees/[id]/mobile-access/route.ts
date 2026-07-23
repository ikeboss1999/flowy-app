import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserSession, hasPermission } from '@/lib/auth-server';
import { parseJsonBody } from '@/lib/api-validation';
import { decryptEmployee } from '@/lib/encryption';
import { Employee } from '@/types/employee';

export const dynamic = 'force-dynamic';

const permissionsSchema = z.object({
    timeTracking: z.boolean(),
    documents: z.boolean(),
    projectDiary: z.boolean(),
});

const mobileAccessSchema = z.discriminatedUnion('action', [
    z.object({ action: z.literal('enable') }),
    z.object({ action: z.literal('disable') }),
    z.object({ action: z.literal('generateActivationCode') }),
    z.object({ action: z.literal('revokeActivationCode') }),
    z.object({ action: z.literal('updatePermissions'), permissions: permissionsSchema }),
]);

function generateNumericCode(length: number) {
    let code = '';
    for (let i = 0; i < length; i += 1) {
        code += crypto.randomInt(0, 10).toString();
    }
    return code;
}

function buildDefaultAppAccess(employee: Employee) {
    return {
        staffId: employee.appAccess?.staffId || generateNumericCode(8),
        accessPIN: employee.appAccess?.accessPIN || '',
        isAccessEnabled: employee.appAccess?.isAccessEnabled ?? false,
        permissions: {
            timeTracking: employee.appAccess?.permissions?.timeTracking ?? true,
            documents: employee.appAccess?.permissions?.documents ?? false,
            personalData: employee.appAccess?.permissions?.personalData ?? true,
            projectDiary: employee.appAccess?.permissions?.projectDiary ?? false,
        },
        lastLogin: employee.appAccess?.lastLogin,
    };
}

function sanitizeEmployee(employee: Employee): Employee {
    if (!employee.appAccess?.accessPIN) return employee;
    return {
        ...employee,
        appAccess: {
            ...employee.appAccess,
            accessPIN: '',
        },
    };
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;

    if (!companyOwnerId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, 'employees_write')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = await parseJsonBody(request, mobileAccessSchema);
    if (!parsed.ok) return parsed.response;

    const client = supabaseAdmin || supabase;

    try {
        const { data, error } = await client
            .from('employees')
            .select('*')
            .eq('id', params.id)
            .eq('userId', companyOwnerId)
            .maybeSingle();

        if (error) throw error;
        if (!data) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        const employee = decryptEmployee(data as Employee);
        const now = new Date().toISOString();
        let appAccess = buildDefaultAppAccess(employee);
        let activationCode: string | undefined;
        let activationCodeExpiresAt: string | undefined;

        if (parsed.data.action === 'enable') {
            appAccess = {
                ...appAccess,
                isAccessEnabled: true,
            };
        }

        if (parsed.data.action === 'disable') {
            appAccess = {
                ...appAccess,
                isAccessEnabled: false,
            };

            await client
                .from('mobile_activation_codes')
                .update({ status: 'revoked', revokedAt: now, updatedAt: now })
                .eq('userId', companyOwnerId)
                .eq('employeeId', employee.id)
                .eq('status', 'active');

            await client
                .from('employee_mobile_sessions')
                .update({ revokedAt: now, updatedAt: now })
                .eq('userId', companyOwnerId)
                .eq('employeeId', employee.id)
                .is('revokedAt', null);
        }

        if (parsed.data.action === 'updatePermissions') {
            appAccess = {
                ...appAccess,
                permissions: {
                    timeTracking: parsed.data.permissions.timeTracking,
                    documents: parsed.data.permissions.documents,
                    personalData: true,
                    projectDiary: parsed.data.permissions.projectDiary,
                },
            };
        }

        if (parsed.data.action === 'generateActivationCode') {
            appAccess = {
                ...appAccess,
                isAccessEnabled: true,
            };
            activationCode = generateNumericCode(6);
            activationCodeExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
            const codeHash = await bcrypt.hash(activationCode, 10);

            await client
                .from('mobile_activation_codes')
                .update({ status: 'revoked', revokedAt: now, updatedAt: now })
                .eq('userId', companyOwnerId)
                .eq('employeeId', employee.id)
                .eq('status', 'active');

            const { error: insertError } = await client
                .from('mobile_activation_codes')
                .insert({
                    userId: companyOwnerId,
                    employeeId: employee.id,
                    codeHash,
                    status: 'active',
                    expiresAt: activationCodeExpiresAt,
                    createdBy: session.userId,
                    createdAt: now,
                    updatedAt: now,
                });

            if (insertError) throw insertError;
        }

        if (parsed.data.action === 'revokeActivationCode') {
            await client
                .from('mobile_activation_codes')
                .update({ status: 'revoked', revokedAt: now, updatedAt: now })
                .eq('userId', companyOwnerId)
                .eq('employeeId', employee.id)
                .eq('status', 'active');
        }

        const { error: updateError } = await client
            .from('employees')
            .update({
                appAccess,
                updated_by: session.userId,
            })
            .eq('id', employee.id)
            .eq('userId', companyOwnerId);

        if (updateError) throw updateError;

        const updatedEmployee = sanitizeEmployee({
            ...employee,
            appAccess,
            updated_by: session.userId,
        });

        return NextResponse.json({
            success: true,
            employee: updatedEmployee,
            activationCode,
            activationCodeExpiresAt,
        });
    } catch (error) {
        console.error('[MobileAccess] Failed to update employee mobile access:', error);
        return NextResponse.json({ error: 'Failed to update mobile access' }, { status: 500 });
    }
}
