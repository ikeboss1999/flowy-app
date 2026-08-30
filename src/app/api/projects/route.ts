import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getUserSession, hasPermission } from '@/lib/auth-server';
import { safeGetCreatedBy, safeUpsert } from '@/lib/supabase-helper';
import { logApiPerformance } from '@/lib/api-performance';

export const dynamic = 'force-dynamic';

const DEFAULT_PROJECT_PREFIX = 'PRJ-';

const idSchema = z.string().trim().min(1, 'ID darf nicht leer sein').max(200, 'ID ist zu lang');
const optionalDateSchema = z.union([
    z.literal(''),
    z.string().trim().max(50, 'Datum ist zu lang').refine(
        value => !Number.isNaN(Date.parse(value)),
        'Ungültiges Datum',
    ),
]).nullish();

const paymentPlanItemSchema = z.object({
    id: idSchema,
    name: z.string().trim().min(1, 'Bezeichnung darf nicht leer sein').max(200, 'Bezeichnung ist zu lang'),
    amount: z.number().finite('Betrag muss eine gültige Zahl sein').min(0, 'Betrag darf nicht negativ sein').max(1_000_000_000, 'Betrag ist zu hoch'),
    status: z.enum(['planned', 'created', 'paid']),
    invoiceId: idSchema.nullish(),
    dueDate: optionalDateSchema,
    description: z.string().trim().max(2000, 'Beschreibung ist zu lang').nullish(),
    type: z.enum(['partial', 'final']).nullish(),
});

const legacyDiaryEntrySchema = z.object({
    id: idSchema,
    date: z.string().trim().min(1, 'Datum darf nicht leer sein').max(50, 'Datum ist zu lang'),
    description: z.string().trim().max(5000, 'Tagebucheintrag ist zu lang'),
    images: z.array(z.string()).max(20, 'Zu viele Bilder pro Tagebucheintrag'),
});

const projectPayloadSchema = z.object({
    id: idSchema.optional(),
    name: z.string().trim().min(1, 'Projektname darf nicht leer sein').max(200, 'Projektname ist zu lang'),
    customerId: idSchema,
    description: z.string().trim().max(10_000, 'Beschreibung ist zu lang').nullish(),
    status: z.enum(['active', 'completed', 'planned', 'on_hold']),
    address: z.object({
        street: z.string().trim().min(1, 'Straße darf nicht leer sein').max(200, 'Straße ist zu lang'),
        city: z.string().trim().min(1, 'Ort darf nicht leer sein').max(120, 'Ort ist zu lang'),
        zip: z.string().trim().min(1, 'Postleitzahl darf nicht leer sein').max(20, 'Postleitzahl ist zu lang'),
    }),
    startDate: optionalDateSchema,
    endDate: optionalDateSchema,
    budget: z.number().finite('Budget muss eine gültige Zahl sein').min(0, 'Budget darf nicht negativ sein').max(1_000_000_000, 'Budget ist zu hoch').nullish(),
    paymentPlan: z.array(paymentPlanItemSchema).max(200, 'Der Zahlungsplan enthält zu viele Positionen').nullish(),
    createdAt: optionalDateSchema,
    updatedAt: optionalDateSchema,
    diaryEntries: z.array(legacyDiaryEntrySchema).max(1000, 'Zu viele alte Tagebucheinträge').nullish(),
}).superRefine((project, context) => {
    if (project.startDate && project.endDate && new Date(project.endDate) < new Date(project.startDate)) {
        context.addIssue({
            code: 'custom',
            path: ['endDate'],
            message: 'Enddatum darf nicht vor dem Startdatum liegen',
        });
    }

    const paymentPlanIds = new Set<string>();
    const paymentPlan = project.paymentPlan || [];
    for (let index = 0; index < paymentPlan.length; index += 1) {
        const item = paymentPlan[index];
        if (paymentPlanIds.has(item.id)) {
            context.addIssue({
                code: 'custom',
                path: ['paymentPlan', index, 'id'],
                message: 'Zahlungsplan enthält eine doppelte ID',
            });
        }
        paymentPlanIds.add(item.id);
    }
});

function validationErrorResponse(error: z.ZodError) {
    return NextResponse.json({
        error: 'Ungültige Projektdaten',
        issues: error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message,
        })),
    }, { status: 400 });
}

function comparablePaymentPlanItem(item: any) {
    return {
        id: String(item?.id || ''),
        name: String(item?.name || ''),
        amount: Number(item?.amount || 0),
        dueDate: item?.dueDate || '',
        description: item?.description || '',
        type: item?.type || null,
    };
}

async function validateLockedPaymentPlanItems(
    client: any,
    companyOwnerId: string,
    existingPlan: any,
    nextPlan: any,
) {
    if (!Array.isArray(existingPlan) || existingPlan.length === 0) return null;

    const existingIds = existingPlan.map(item => String(item?.id || '')).filter(Boolean);
    if (existingIds.length === 0) return null;

    const { data: linkedInvoices, error } = await client
        .from('invoices')
        .select('paymentPlanItemId,status')
        .eq('userId', companyOwnerId)
        .in('paymentPlanItemId', existingIds)
        .neq('status', 'canceled');
    if (error) throw error;

    const lockedIds = new Set((linkedInvoices || []).map((invoice: any) => String(invoice.paymentPlanItemId)));
    if (lockedIds.size === 0) return null;

    const nextItems = new Map(
        (Array.isArray(nextPlan) ? nextPlan : []).map(item => [String(item?.id || ''), item])
    );

    for (const existingItem of existingPlan) {
        const id = String(existingItem?.id || '');
        if (!lockedIds.has(id)) continue;

        const nextItem = nextItems.get(id);
        if (!nextItem || JSON.stringify(comparablePaymentPlanItem(existingItem)) !== JSON.stringify(comparablePaymentPlanItem(nextItem))) {
            return NextResponse.json({
                error: 'Eine bereits mit einer Rechnung verknüpfte Zahlungsposition darf nicht verändert oder gelöscht werden.',
            }, { status: 409 });
        }
    }

    return null;
}

function readProjectSettings(settings: any) {
    return settings?.projectSettings || settings?.accountSettings?.projectSettings || {};
}

function formatProjectNumber(prefix: string, value: number) {
    return `${prefix}${value}`;
}

async function getProjectNumberConfig(client: any, companyOwnerId: string) {
    const { data, error } = await client
        .from('settings')
        .select('*')
        .eq('userId', companyOwnerId)
        .maybeSingle();
    if (error) throw error;

    const projectSettings = readProjectSettings(data);
    const prefix = typeof projectSettings.projectNumberPrefix === 'string'
        ? projectSettings.projectNumberPrefix
        : DEFAULT_PROJECT_PREFIX;
    const configuredNextNumber = Math.max(1, Number(projectSettings.nextProjectNumber) || 1);

    const { data: existingNumbers, error: numbersError } = await client
        .from('projects')
        .select('projectNumber')
        .eq('userId', companyOwnerId)
        .like('projectNumber', `${prefix}%`)
        .limit(5000);
    if (numbersError) throw numbersError;

    const highestUsedNumber = (existingNumbers || []).reduce((highest: number, row: any) => {
        const projectNumber = String(row.projectNumber || '');
        const suffix = projectNumber.startsWith(prefix) ? projectNumber.slice(prefix.length) : '';
        return /^\d+$/.test(suffix) ? Math.max(highest, Number(suffix)) : highest;
    }, 0);

    return {
        settings: data || {},
        prefix,
        nextNumber: Math.max(configuredNextNumber, highestUsedNumber + 1),
    };
}

async function updateNextProjectNumber(
    client: any,
    companyOwnerId: string,
    actorUserId: string,
    settings: any,
    prefix: string,
    nextNumber: number,
) {
    const currentProjectSettings = readProjectSettings(settings);
    const updatedSettings = {
        ...settings,
        userId: companyOwnerId,
        projectSettings: {
            ...currentProjectSettings,
            projectNumberPrefix: prefix,
            nextProjectNumber: nextNumber,
        },
        updatedAt: new Date().toISOString(),
        updated_by: actorUserId,
    };

    if (!settings.userId) updatedSettings.created_by = actorUserId;
    const { error } = await safeUpsert(client, 'settings', updatedSettings);
    if (error) throw error;
}

export async function GET(request: Request) {
    const startedAt = performance.now();
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;

    if (!companyOwnerId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, 'projects_read')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const client = supabaseAdmin || supabase;
        const { data: projects, error } = await client
            .from('projects')
            .select('*')
            .eq('userId', companyOwnerId)
            .order('createdAt', { ascending: false })
            .limit(500);
        if (error) throw error;
        logApiPerformance('/api/projects', startedAt, { payload: projects });
        return NextResponse.json(projects);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;

    if (!companyOwnerId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, 'projects_write')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        let payload: unknown;
        try {
            payload = await request.json();
        } catch {
            return NextResponse.json({ error: 'Ungültiger JSON-Inhalt' }, { status: 400 });
        }

        const unwrappedPayload = payload && typeof payload === 'object' && 'project' in payload
            ? (payload as { project: unknown }).project
            : payload;
        const validation = projectPayloadSchema.safeParse(unwrappedPayload);
        if (!validation.success) return validationErrorResponse(validation.error);
        const project = validation.data;

        const projectId = project.id || nanoid();
        const now = new Date().toISOString();

        const client = supabaseAdmin || supabase;

        const { data: existingProject, error: existingProjectError } = await client
            .from('projects')
            .select('id,projectNumber,createdAt,created_by,paymentPlan')
            .eq('id', projectId)
            .eq('userId', companyOwnerId)
            .maybeSingle();
        if (existingProjectError) throw existingProjectError;

        if (existingProject) {
            const lockedPlanResponse = await validateLockedPaymentPlanItems(
                client,
                companyOwnerId,
                existingProject.paymentPlan,
                project.paymentPlan,
            );
            if (lockedPlanResponse) return lockedPlanResponse;
        }

        if (project.customerId) {
            const { data: customer, error: customerError } = await client
                .from('customers')
                .select('id,status')
                .eq('id', project.customerId)
                .eq('userId', companyOwnerId)
                .maybeSingle();

            if (customerError) throw customerError;
            if (customer?.status === 'draft') {
                return NextResponse.json({ error: 'Draft customers cannot be used for projects' }, { status: 400 });
            }
        }

        const createdBy = existingProject?.created_by
            || (project.id ? await safeGetCreatedBy(client, 'projects', project.id) : null);

        let projectNumber = existingProject?.projectNumber;
        let numberConfig: Awaited<ReturnType<typeof getProjectNumberConfig>> | null = null;
        let allocatedNumber: number | null = null;

        if (!existingProject) {
            numberConfig = await getProjectNumberConfig(client, companyOwnerId);
            allocatedNumber = numberConfig.nextNumber;
            projectNumber = formatProjectNumber(numberConfig.prefix, allocatedNumber);
        }

        const projectData = {
            ...project,
            id: projectId,
            userId: companyOwnerId,
            projectNumber,
            createdAt: existingProject?.createdAt || project.createdAt || now,
            updatedAt: now,
            updated_by: session.userId,
            created_by: createdBy || session.userId
        };

        let savedProject: any = null;
        let saveError: any = null;

        for (let attempt = 0; attempt < 20; attempt += 1) {
            const result = await safeUpsert(client, 'projects', projectData);
            savedProject = result.data;
            saveError = result.error;

            if (!saveError) break;
            if (existingProject || saveError.code !== '23505' || !numberConfig || allocatedNumber === null) {
                throw saveError;
            }

            allocatedNumber += 1;
            projectData.projectNumber = formatProjectNumber(numberConfig.prefix, allocatedNumber);
        }

        if (saveError) throw saveError;

        if (!existingProject && numberConfig && allocatedNumber !== null) {
            try {
                await updateNextProjectNumber(
                    client,
                    companyOwnerId,
                    session.userId,
                    numberConfig.settings,
                    numberConfig.prefix,
                    allocatedNumber + 1,
                );
            } catch (settingsError) {
                // The project is already persisted. A stale counter is recoverable because
                // the unique index and retry loop skip numbers that are already in use.
                console.warn('[ProjectsAPI] Project saved, but number counter update failed:', settingsError);
            }
        }

        return NextResponse.json({
            success: true,
            id: projectId,
            projectNumber: projectData.projectNumber,
            project: savedProject || projectData,
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;

    if (!companyOwnerId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, 'projects_write')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    try {
        const client = supabaseAdmin || supabase;
        const { error } = await client
            .from('projects')
            .delete()
            .eq('id', id)
            .eq('userId', companyOwnerId);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

