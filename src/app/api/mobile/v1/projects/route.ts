import { NextResponse } from 'next/server';
import { requireMobileSession } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const auth = await requireMobileSession(request, 'projectDiary');
        if (!auth.ok) return auth.response;

        const { data: assignments, error: assignmentsError } = await auth.client
            .from('project_assignments')
            .select('*')
            .eq('userId', auth.companyOwnerId)
            .eq('employeeId', auth.employeeId)
            .eq('status', 'active')
            .order('createdAt', { ascending: false });

        if (assignmentsError) throw assignmentsError;

        const projectIds = (assignments || []).map((assignment: any) => assignment.projectId);
        if (projectIds.length === 0) {
            return NextResponse.json({ projects: [] });
        }

        const { data: projects, error: projectsError } = await auth.client
            .from('projects')
            .select('id,projectNumber,name,description,status,address,startDate,endDate')
            .eq('userId', auth.companyOwnerId)
            .eq('status', 'active')
            .in('id', projectIds);

        if (projectsError) throw projectsError;

        const assignmentByProjectId = new Map((assignments || []).map((assignment: any) => [assignment.projectId, assignment]));
        const responseProjects = (projects || []).map((project: any) => {
            const assignment: any = assignmentByProjectId.get(project.id);
            return {
                ...project,
                assignment: assignment
                    ? {
                        id: assignment.id,
                        task: assignment.task,
                        startDate: assignment.startDate,
                        endDate: assignment.endDate,
                    }
                    : null,
            };
        });

        return NextResponse.json({ projects: responseProjects });
    } catch (error) {
        console.error('[MobileProjects] failed:', error);
        return NextResponse.json({ error: 'Failed to fetch mobile projects' }, { status: 500 });
    }
}
