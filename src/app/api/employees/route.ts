import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { nanoid } from 'nanoid';
import { getUserSession, hasPermission } from '@/lib/auth-server';
import { encryptEmployee, decryptEmployee } from '@/lib/encryption';
import { safeUpsert } from '@/lib/supabase-helper';
import {
    getEmployeeAvatarStoragePath,
    persistEmployeeInlineAvatar,
    withResolvedEmployeeAvatar,
} from '@/lib/employee-avatar';
import { logApiPerformance } from '@/lib/api-performance';

export const dynamic = 'force-dynamic';

const emptyBankDetails = {
    iban: '',
    bic: '',
    bankName: '',
};

function normalizeIban(value: unknown) {
    return String(value || '').replace(/\s+/g, '').toUpperCase();
}

function isValidAustrianIban(value: string) {
    if (!value.startsWith('AT')) return true;
    if (!/^AT\d{18}$/.test(value)) return false;

    const numericValue = `${value.slice(4)}${value.slice(0, 4)}`.replace(/[A-Z]/g, (letter) => String(letter.charCodeAt(0) - 55));
    const remainder = numericValue.split('').reduce((current, digit) => (current * 10 + Number(digit)) % 97, 0);
    return remainder === 1;
}

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
            ? 'id,employeeNumber,personalData,employment,additionalInfo,weeklySchedule,documents,createdAt,updatedAt,userId,appAccess,pendingChanges,sharedFolders,created_by,updated_by'
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

        let isNew = !employee.id;
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
            } else {
                // The client creates a temporary id before submitting a new
                // employee. Treat that id as a new record when it is not in
                // the database yet, so numbering is advanced as well.
                isNew = true;
            }
        }

        const normalizedEmployee = {
            ...employee,
            id: empId,
            bankDetails: {
                ...emptyBankDetails,
                ...(employee.bankDetails || {}),
                iban: normalizeIban(employee.bankDetails?.iban),
                bic: String(employee.bankDetails?.bic || '').toUpperCase(),
            },
            avatar: await persistEmployeeInlineAvatar({
                avatar: employee.avatar,
                companyOwnerId,
                employeeId: empId,
            }),
        };

        if (!isValidAustrianIban(normalizedEmployee.bankDetails.iban)) {
            return NextResponse.json(
                { message: 'Ungültige österreichische IBAN. Verwenden Sie AT plus 18 Ziffern.' },
                { status: 400 },
            );
        }

        const normalizedEmployeeNumber = String(normalizedEmployee.employeeNumber || '').trim().toLocaleLowerCase();
        if (normalizedEmployeeNumber) {
            const { data: existingNumberRows, error: numberLookupError } = await client
                .from('employees')
                .select('id,employeeNumber')
                .eq('userId', companyOwnerId);

            if (numberLookupError) throw numberLookupError;

            const duplicateNumber = (existingNumberRows || []).some((row: any) => {
                if (row.id === empId) return false;
                const existingNumber = String(decryptEmployee(row as any).employeeNumber || '').trim().toLocaleLowerCase();
                return existingNumber === normalizedEmployeeNumber;
            });

            if (duplicateNumber) {
                return NextResponse.json(
                    { message: `Die Personalnummer ${normalizedEmployee.employeeNumber} ist bereits vergeben.` },
                    { status: 409 },
                );
            }
        }

        const encryptedEmployee = encryptEmployee(normalizedEmployee);
        const { employeeNumber, personalData, bankDetails, employment, additionalInfo, weeklySchedule, documents, avatar, pendingChanges, sharedFolders, createdAt } = encryptedEmployee;
        let { appAccess } = encryptedEmployee;

        // Hash PIN if it's a new plain-text value (not already a bcrypt hash)
        if (appAccess?.accessPIN) {
            const isAlreadyHashed = appAccess.accessPIN.startsWith('$2b$') || appAccess.accessPIN.startsWith('$2a$');
            if (!isAlreadyHashed) {
                appAccess = { ...appAccess, accessPIN: await bcrypt.hash(appAccess.accessPIN, 10) };
            }
        }

        // The employee overview intentionally omits document content for
        // performance. Edits and reactivations originating there must never
        // overwrite the stored file data with these content-free summaries.
        // Document deletion is handled exclusively by the documents endpoint.
        let finalDocuments = documents;
        if (existingDecrypted) {
            const existingDocs = Array.isArray(existingDecrypted.documents) ? existingDecrypted.documents : [];
            const incomingDocs = Array.isArray(documents) ? documents : [];
            const incomingById = new Map(incomingDocs.map((document: any) => [document.id, document]));
            const existingIds = new Set(existingDocs.map((document: any) => document.id));

            finalDocuments = [
                ...existingDocs.map((existingDocument: any) => {
                    const incomingDocument = incomingById.get(existingDocument.id);
                    if (!incomingDocument) return existingDocument;

                    return {
                        ...existingDocument,
                        ...incomingDocument,
                        content: incomingDocument.content || existingDocument.content,
                    };
                }),
                ...incomingDocs.filter((document: any) => !existingIds.has(document.id)),
            ];
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

        // Keep the company numbering counter in sync with newly created
        // employees. This is intentionally done server-side so the counter
        // cannot be lost when the client is navigating or generating a
        // Dienstzettel immediately after creation.
        if (isNew) {
            // `encryptEmployee` may encrypt the employee number as well. Use
            // the plain value from the submitted employee for the counter.
            const numericEmployeeNumber = parseInt(
                String(normalizedEmployee.employeeNumber || '').replace(/\D/g, ''),
                10,
            ) || 0;
            if (numericEmployeeNumber > 0) {
                const { data: settingsRow } = await client
                    .from('settings')
                    .select('companyData')
                    .eq('userId', companyOwnerId)
                    .maybeSingle();

                if (settingsRow) {
                    const currentCompanyData = settingsRow.companyData || {};
                    const configuredNext = parseInt(
                        String(currentCompanyData.nextEmployeeNumber || '').replace(/\D/g, ''),
                        10,
                    ) || 1;

                    if (numericEmployeeNumber >= configuredNext) {
                        const { error: counterError } = await client
                            .from('settings')
                            .update({
                                companyData: {
                                    ...currentCompanyData,
                                    nextEmployeeNumber: String(numericEmployeeNumber + 1),
                                },
                                updatedAt: new Date().toISOString(),
                                updated_by: session.userId,
                            })
                            .eq('userId', companyOwnerId);

                        if (counterError) {
                            console.error('[EmployeesAPI] Failed to advance employee number counter:', counterError);
                        }
                    }
                }
            }
        }

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

