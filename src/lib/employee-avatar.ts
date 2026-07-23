import { nanoid } from 'nanoid';
import { supabaseAdmin } from '@/lib/supabase-admin';

const EMPLOYEE_AVATAR_PREFIX = 'storage:employee-avatars:';

export const ALLOWED_EMPLOYEE_AVATAR_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
]);

export const MAX_EMPLOYEE_AVATAR_SIZE = 5 * 1024 * 1024;

export function sanitizeAvatarPathPart(value: string) {
    return value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 80) || 'avatar';
}

export function buildEmployeeAvatarStoragePath(params: {
    companyOwnerId: string;
    employeeId: string;
    fileName: string;
}) {
    const extension = params.fileName.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
    const baseName = params.fileName.replace(/\.[^/.]+$/, '');
    return `${params.companyOwnerId}/${params.employeeId}/${nanoid()}-${sanitizeAvatarPathPart(baseName)}.${extension}`;
}

export function toEmployeeAvatarReference(storagePath: string) {
    return `${EMPLOYEE_AVATAR_PREFIX}${storagePath}`;
}

export function getEmployeeAvatarStoragePath(avatar?: string | null) {
    if (!avatar) return null;
    if (avatar.startsWith(EMPLOYEE_AVATAR_PREFIX)) {
        return avatar.slice(EMPLOYEE_AVATAR_PREFIX.length);
    }
    if (!avatar.startsWith('data:') && !avatar.startsWith('http://') && !avatar.startsWith('https://') && avatar.includes('/')) {
        return avatar;
    }
    return null;
}

export async function resolveEmployeeAvatarUrl(avatar?: string | null) {
    if (!avatar) return null;
    if (avatar.startsWith('data:image/') || avatar.startsWith('http://') || avatar.startsWith('https://')) {
        return avatar;
    }

    const storagePath = getEmployeeAvatarStoragePath(avatar);
    if (!storagePath || !supabaseAdmin) return null;

    const { data, error } = await supabaseAdmin.storage
        .from('employee-avatars')
        .createSignedUrl(storagePath, 10 * 60, { download: false });

    if (error) {
        console.error('[EmployeeAvatar] failed to create signed url:', error);
        return null;
    }

    return data.signedUrl;
}

export async function withResolvedEmployeeAvatar<T extends { avatar?: string | null }>(employee: T): Promise<T & { avatarUrl?: string | null }> {
    const avatarUrl = await resolveEmployeeAvatarUrl(employee.avatar);
    return { ...employee, avatarUrl };
}
