import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { nanoid } from 'nanoid';
import { getUserSession, hasPermission } from '@/lib/auth-server';
import { encryptEmployee, decryptEmployee } from '@/lib/encryption';
import { safeGetCreatedBy, safeUpsert } from '@/lib/supabase-helper';
import {
    ALLOWED_EMPLOYEE_AVATAR_MIME_TYPES,
    buildEmployeeAvatarStoragePath,
    getEmployeeAvatarStoragePath,
    toEmployeeAvatarReference,
    withResolvedEmployeeAvatar,
} from '@/lib/employee-avatar';
import { logApiPerformance } from '@/lib/api-performance';

export const dynamic = 'force-dynamic';

const emptyBankDetails = {
    iban: '',
    bic: '',
    bankName: '',
};

function stripDocumentContent(documents: any[] = []) {
    return documents.map(({ content, ...document }) => document);
}

function toEmployeeSummary(employee: any) {
    const decrypted = decryptEmployee(employee);

    return {
        id: decrypted.id,
        employeeNumber: decrypted.employeeNumber || '',
        personalData: {
            firstName: decrypted.personalData?.firstName || '',
            lastName: decrypted.personalData?.lastName || '',
            email: decrypted.personalData?.email || '',
            phone: decrypted.personalData?.phone || '',
            birthday: decrypted.personalData?.birthday || '',
            birthPlace: '',
            birthCountry: '',
            nationality: '',
            maritalStatus: '',
            street: '',
            city: '',
            zip: '',
            socialSecurityNumber: '',
            taxId: '',
            healthInsurance: '',
        },
        bankDetails: emptyBankDetails,
        employment: {
            position: decrypted.employment?.position || '',
            status: decrypted.employment?.status || 'Vollzeit',
            startDate: decrypted.employment?.startDate || '',
            endDate: decrypted.employment?.endDate || '',
            exitReason: decrypted.employment?.exitReason || '',
            salary: '',
            workerType: decrypted.employment?.workerType || 'Arbeiter',
            classification: decrypted.employment?.classification || '',
            verwendung: decrypted.employment?.verwendung || '',
            annualLeave: decrypted.employment?.annualLeave ?? 25,
            isActive: decrypted.employment?.isActive,
        },
        additionalInfo: {
            noTimeTrackingRequired: !!decrypted.additionalInfo?.noTimeTrackingRequired,
            isDraft: !!decrypted.additionalInfo?.isDraft,
        },
        weeklySchedule: decrypted.weeklySchedule,
        documents: stripDocumentContent(decrypted.documents || []),
        createdAt: decrypted.createdAt,
        updatedAt: decrypted.updatedAt,
        avatar: null,
        avatarUrl: null,
        userId: decrypted.userId,
        appAccess: decrypted.appAccess
            ? {
                ...decrypted.appAccess,
                accessPIN: '',
            }
            : undefined,
        pendingChanges: decrypted.pendingChanges,
        sharedFolders: decrypted.sharedFolders,
        created_by: decrypted.created_by,
        updated_by: decrypted.updated_by,
    };
}

async function persistInlineAvatar(params: {
    avatar?: string | null;
    companyOwnerId: string;
    employeeId: string;
}) {
    if (!params.avatar || !params.avatar.startsWith('data:image/')) {
        return params.avatar ?? null;
    }

    if (!supabaseAdmin) {
        return params.avatar;
    }

    const match = params.avatar.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return params.avatar;

    const [, mimeType, base64] = match;
    if (!ALLOWED_EMPLOYEE_AVATAR_MIME_TYPES.has(mimeType)) {
        return params.avatar;
    }

    const extension = mimeType.split('/')[1] || 'jpg';
    const storagePath = buildEmployeeAvatarStoragePath({
        companyOwnerId: params.companyOwnerId,
        employeeId: params.employeeId,
        fileName: `avatar.${extension}`,
    });

    const { error } = await supabaseAdmin.storage
        .from('employee-avatars')
        .upload(storagePath, Buffer.from(base64, 'base64'), {
            contentType: mimeType,
            upsert: true,
        });

    if (error) throw error;

    return toEmployeeAvatarReference(storagePath);
}

export async function GET(request: Request) {
    const startedAt = performance.now();
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;
    const { searchParams } = new URL(request.url);
    const summaryOnly = searchParams.get('summary') === '1';

    if (!companyOwnerId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    if (!hasPermission(session, 'employees_read')) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    try {
        const client = supabaseAdmin || supabase;
        const selectColumns = summaryOnly
            ? 'id,employeeNumber,personalData,employment,additionalInfo,weeklySchedule,createdAt,updatedAt,userId,appAccess,pendingChanges,sharedFolders,created_by,updated_by'
            : '*';
        const { data: employees, error } = await (client as any)
            .from('employees')
            .select(selectColumns)
            .eq('userId', companyOwnerId)
            .order('createdAt', { ascending: false })
            .limit(200);
        if (error) throw error;
        const decryptedEmployees = summaryOnly
            ? (employees || []).map((employee: any) => toEmployeeSummary(employee))
            : await Promise.all((employees || []).map((employee: any) => withResolvedEmployeeAvatar(decryptEmployee(employee))));
        logApiPerformance('/api/employees', startedAt, {
            rows: decryptedEmployees.length,
            payload: decryptedEmployees,
            note: summaryOnly ? 'summary' : 'full',
        });
        return NextResponse.json(decryptedEmployees);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;

    if (!companyOwnerId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    try {
        const payload = await request.json();
        const employee = payload.employee || payload;

        const isNew = !employee.id;
        const requiredPermission = isNew ? 'employees_create' : 'employees_write';
        if (!hasPermission(session, requiredPermission)) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const empId = employee.id || nanoid();
        const client = supabaseAdmin || supabase;
        let existingDecrypted: any = null;
        let createdBy = null;
        let previousAvatarStoragePath: string | null = null;

        if (employee.id) {
            const { data: existingRow } = await client
                .from('employees')
                .select('*')
                .eq('id', employee.id)
                .eq('userId', companyOwnerId)
                .maybeSingle();

            if (existingRow) {
                createdBy = existingRow.created_by;
                existingDecrypted = decryptEmployee(existingRow as any);
                previousAvatarStoragePath = getEmployeeAvatarStoragePath(existingDecrypted.avatar);
            }
        }

        const normalizedEmployee = {
            ...employee,
            id: empId,
            avatar: await persistInlineAvatar({
                avatar: employee.avatar,
                companyOwnerId,
                employeeId: empId,
            }),
        };

        const encryptedEmployee = encryptEmployee(normalizedEmployee);
        const { id, employeeNumber, personalData, bankDetails, employment, additionalInfo, weeklySchedule, documents, avatar, pendingChanges, sharedFolders, createdAt } = encryptedEmployee;
        let { appAccess } = encryptedEmployee;

        // Hash PIN if it's a new plain-text value (not already a bcrypt hash)
        if (appAccess?.accessPIN) {
            const isAlreadyHashed = appAccess.accessPIN.startsWith('$2b$') || appAccess.accessPIN.startsWith('$2a$');
            if (!isAlreadyHashed) {
                appAccess = { ...appAccess, accessPIN: await bcrypt.hash(appAccess.accessPIN, 10) };
            }
        }

        // Fetch existing employee to preserve documents if summary mode payload is passed
        let finalDocuments = documents;
        if (existingDecrypted) {
            const existingDocs = existingDecrypted.documents || [];
            // If incoming documents is empty/undefined but DB has documents, keep DB documents
            if ((!documents || documents.length === 0) && existingDocs.length > 0) {
                finalDocuments = existingDocs;
            }
        }

        const employeeData = {
            id: empId,
            employeeNumber,
            personalData,
            bankDetails,
            employment,
            additionalInfo,
            weeklySchedule,
            documents: finalDocuments,
            avatar,
            appAccess,
            pendingChanges,
            sharedFolders,
            createdAt: createdAt || new Date().toISOString(),
            userId: companyOwnerId,
            updated_by: session.userId,
            created_by: createdBy || session.userId
        };

        const { error } = await safeUpsert(client, 'employees', employeeData);
        if (error) throw error;

        const nextAvatarStoragePath = getEmployeeAvatarStoragePath(String(avatar || ''));
        if (previousAvatarStoragePath && previousAvatarStoragePath !== nextAvatarStoragePath && supabaseAdmin) {
            await supabaseAdmin.storage.from('employee-avatars').remove([previousAvatarStoragePath]);
        }

        return NextResponse.json({ success: true, id: empId });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;

    if (!companyOwnerId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    if (!hasPermission(session, 'employees_write')) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    try {
        const client = supabaseAdmin || supabase;
        const { error } = await client
            .from('employees')
            .delete()
            .eq('id', id)
            .eq('userId', companyOwnerId);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

