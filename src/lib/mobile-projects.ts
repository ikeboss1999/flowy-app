import { NextResponse } from 'next/server';
import { z } from 'zod';

export const mobileDiaryEntrySchema = z.object({
    description: z.string().trim().min(1).max(5000),
    visibility: z.enum(['office', 'assigned_team']).default('office'),
    clientOperationId: z.string().trim().min(1).max(120).optional(),
    attachments: z.array(z.object({
        storagePath: z.string().trim().min(1).max(500),
        mimeType: z.string().trim().min(1).max(120),
        fileSize: z.number().int().positive().max(15 * 1024 * 1024),
    })).max(10).default([]),
});

export const mobileDiaryUploadUrlSchema = z.object({
    fileName: z.string().trim().min(1).max(180),
    mimeType: z.string().trim().min(1).max(120),
    fileSize: z.number().int().positive().max(15 * 1024 * 1024),
});

export const ALLOWED_DIARY_ATTACHMENT_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
]);

export function sanitizePathPart(value: string) {
    return value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 90) || 'file';
}

export function mobileProjectStoragePrefix(params: {
    companyOwnerId: string;
    employeeId: string;
    projectId: string;
}) {
    return `${params.companyOwnerId}/${params.projectId}/${params.employeeId}/`;
}

export async function getAssignedMobileProject(client: any, params: {
    companyOwnerId: string;
    employeeId: string;
    projectId: string;
}) {
    const { data: assignment, error: assignmentError } = await client
        .from('project_assignments')
        .select('*')
        .eq('userId', params.companyOwnerId)
        .eq('employeeId', params.employeeId)
        .eq('projectId', params.projectId)
        .eq('status', 'active')
        .maybeSingle();

    if (assignmentError) throw assignmentError;
    if (!assignment) return null;

    const { data: project, error: projectError } = await client
        .from('projects')
        .select('id,projectNumber,name,description,status,address,startDate,endDate,customerId,budget,createdAt,updatedAt')
        .eq('id', params.projectId)
        .eq('userId', params.companyOwnerId)
        .eq('status', 'active')
        .maybeSingle();

    if (projectError) throw projectError;
    if (!project) return null;

    return { project, assignment };
}

export function notAssignedProjectResponse() {
    return NextResponse.json({ error: 'Project not found or not assigned to this mobile employee' }, { status: 404 });
}

export function serializeMobileProject(project: any, assignment: any) {
    return {
        ...project,
        assignment: {
            id: assignment.id,
            task: assignment.task,
            startDate: assignment.startDate,
            endDate: assignment.endDate,
        },
    };
}
