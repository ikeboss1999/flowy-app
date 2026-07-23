import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireApiSession } from '@/lib/api-auth';
import { parseJsonBody } from '@/lib/api-validation';

export const dynamic = 'force-dynamic';

const MAX_ACTIVE_ASSIGNMENTS = 2;

const assignmentSchema = z.object({
    projectId: z.string().min(1),
    task: z.string().trim().max(160).optional(),
    startDate: z.string().trim().optional(),
    endDate: z.string().trim().optional(),
});

async function verifyEmployee(client: any, employeeId: string, userId: string) {
    const { data, error } = await client
        .from('employees')
        .select('id')
        .eq('id', employeeId)
        .eq('userId', userId)
        .maybeSingle();

    if (error) throw error;
    return !!data;
}

async function listAssignments(client: any, employeeId: string, userId: string) {
    const { data, error } = await client
        .from('project_assignments')
        .select('*')
        .eq('userId', userId)
        .eq('employeeId', employeeId)
        .eq('status', 'active')
        .order('createdAt', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
    const auth = await requireApiSession('employees_read');
    if (!auth.ok) return auth.response;

    try {
        const client = supabaseAdmin || supabase;
        const employeeExists = await verifyEmployee(client, params.id, auth.companyOwnerId);
        if (!employeeExists) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

        const [{ data: projects, error: projectsError }, assignments] = await Promise.all([
            client
                .from('projects')
                .select('id,projectNumber,name,description,status,address,startDate,endDate')
                .eq('userId', auth.companyOwnerId)
                .eq('status', 'active')
                .order('name', { ascending: true }),
            listAssignments(client, params.id, auth.companyOwnerId),
        ]);

        if (projectsError) throw projectsError;

        const projectById = new Map((projects || []).map((project: any) => [project.id, project]));
        const hydratedAssignments = assignments.map((assignment: any) => ({
            ...assignment,
            project: projectById.get(assignment.projectId) || null,
        }));

        return NextResponse.json({
            maxActiveAssignments: MAX_ACTIVE_ASSIGNMENTS,
            projects: projects || [],
            assignments: hydratedAssignments,
        });
    } catch (error) {
        console.error('[EmployeeMobileProjects] GET failed:', error);
        return NextResponse.json({ error: 'Failed to fetch mobile project assignments' }, { status: 500 });
    }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
    const auth = await requireApiSession('employees_write');
    if (!auth.ok) return auth.response;

    const parsed = await parseJsonBody(request, assignmentSchema);
    if (!parsed.ok) return parsed.response;

    try {
        const client = supabaseAdmin || supabase;
        const employeeExists = await verifyEmployee(client, params.id, auth.companyOwnerId);
        if (!employeeExists) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

        const { data: project, error: projectError } = await client
            .from('projects')
            .select('id,status')
            .eq('id', parsed.data.projectId)
            .eq('userId', auth.companyOwnerId)
            .maybeSingle();

        if (projectError) throw projectError;
        if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        if (project.status !== 'active') {
            return NextResponse.json({ error: 'Only active projects can be assigned to mobile users' }, { status: 400 });
        }

        const { data: existing, error: existingError } = await client
            .from('project_assignments')
            .select('id')
            .eq('userId', auth.companyOwnerId)
            .eq('employeeId', params.id)
            .eq('projectId', parsed.data.projectId)
            .eq('status', 'active')
            .maybeSingle();

        if (existingError) throw existingError;
        if (existing) return NextResponse.json({ error: 'Project already assigned' }, { status: 409 });

        const { count, error: countError } = await client
            .from('project_assignments')
            .select('id', { count: 'exact', head: true })
            .eq('userId', auth.companyOwnerId)
            .eq('employeeId', params.id)
            .eq('status', 'active');

        if (countError) throw countError;
        if ((count || 0) >= MAX_ACTIVE_ASSIGNMENTS) {
            return NextResponse.json({ error: 'A mobile employee can have at most two active projects' }, { status: 409 });
        }

        const now = new Date().toISOString();
        const { data, error } = await client
            .from('project_assignments')
            .insert({
                userId: auth.companyOwnerId,
                employeeId: params.id,
                projectId: parsed.data.projectId,
                task: parsed.data.task || null,
                startDate: parsed.data.startDate || null,
                endDate: parsed.data.endDate || null,
                status: 'active',
                createdBy: auth.actorUserId,
                updatedBy: auth.actorUserId,
                createdAt: now,
                updatedAt: now,
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        console.error('[EmployeeMobileProjects] POST failed:', error);
        return NextResponse.json({ error: 'Failed to assign mobile project' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    const auth = await requireApiSession('employees_write');
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('id');
    if (!assignmentId) return NextResponse.json({ error: 'Assignment ID required' }, { status: 400 });

    try {
        const client = supabaseAdmin || supabase;
        const employeeExists = await verifyEmployee(client, params.id, auth.companyOwnerId);
        if (!employeeExists) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

        const { error } = await client
            .from('project_assignments')
            .update({
                status: 'inactive',
                updatedBy: auth.actorUserId,
                updatedAt: new Date().toISOString(),
            })
            .eq('id', assignmentId)
            .eq('userId', auth.companyOwnerId)
            .eq('employeeId', params.id)
            .eq('status', 'active');

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[EmployeeMobileProjects] DELETE failed:', error);
        return NextResponse.json({ error: 'Failed to remove mobile project assignment' }, { status: 500 });
    }
}
