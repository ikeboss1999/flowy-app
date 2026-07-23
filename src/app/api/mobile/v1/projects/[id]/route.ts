import { NextResponse } from 'next/server';
import { requireMobileSession } from '@/lib/mobile-auth';
import {
    getAssignedMobileProject,
    notAssignedProjectResponse,
    serializeMobileProject,
} from '@/lib/mobile-projects';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const auth = await requireMobileSession(request, 'projectDiary');
        if (!auth.ok) return auth.response;

        const assigned = await getAssignedMobileProject(auth.client, {
            companyOwnerId: auth.companyOwnerId,
            employeeId: auth.employeeId,
            projectId: params.id,
        });

        if (!assigned) return notAssignedProjectResponse();

        return NextResponse.json({
            project: serializeMobileProject(assigned.project, assigned.assignment),
        });
    } catch (error) {
        console.error('[MobileProjectDetail] failed:', error);
        return NextResponse.json({ error: 'Failed to fetch mobile project detail' }, { status: 500 });
    }
}
