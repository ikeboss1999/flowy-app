import { nanoid } from 'nanoid';
import { supabaseAdmin } from '@/lib/supabase-admin';

const EMPLOYEE_AVATAR_PREFIX = 'storage:employee-avatars:';
const EMPLOYEE_AVATAR_THUMB_PREFIX = 'storage:employee-avatars-thumb:';

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

export function toEmployeeAvatarThumbReference(storagePath: string) {
    return `${EMPLOYEE_AVATAR_THUMB_PREFIX}${storagePath}`;
}

export function getEmployeeAvatarStoragePath(avatar?: string | null) {
    if (!avatar) return null;
    if (avatar.startsWith(EMPLOYEE_AVATAR_PREFIX)) {
        return avatar.slice(EMPLOYEE_AVATAR_PREFIX.length);
    }
    if (avatar.startsWith(EMPLOYEE_AVATAR_THUMB_PREFIX)) {
        return avatar.slice(EMPLOYEE_AVATAR_THUMB_PREFIX.length);
    }
    if (!avatar.startsWith('data:') && !avatar.startsWith('http://') && !avatar.startsWith('https://') && avatar.includes('/')) {
        return avatar;
    }
    return null;
}

export function getEmployeeAvatarThumbStoragePath(avatar?: string | null) {
    const storagePath = getEmployeeAvatarStoragePath(avatar);
    if (!storagePath) return null;
    if (storagePath.includes('/thumbs/')) return storagePath;

    const slashIndex = storagePath.lastIndexOf('/');
    const directory = slashIndex >= 0 ? storagePath.slice(0, slashIndex) : '';
    const fileName = slashIndex >= 0 ? storagePath.slice(slashIndex + 1) : storagePath;
    const baseName = fileName.replace(/\.[^/.]+$/, '') || 'avatar';
    return `${directory}/thumbs/${baseName}.webp`;
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

export async function storageObjectExists(storagePath: string) {
    if (!supabaseAdmin) return false;
    const slashIndex = storagePath.lastIndexOf('/');
    const directory = slashIndex >= 0 ? storagePath.slice(0, slashIndex) : '';
    const fileName = slashIndex >= 0 ? storagePath.slice(slashIndex + 1) : storagePath;

    const { data, error } = await supabaseAdmin.storage
        .from('employee-avatars')
        .list(directory, { search: fileName, limit: 1 });

    if (error) return false;
    return (data || []).some((item) => item.name === fileName);
}

export async function hasEmployeeAvatarThumb(avatar?: string | null) {
    const thumbPath = getEmployeeAvatarThumbStoragePath(avatar);
    if (!thumbPath) return false;
    return storageObjectExists(thumbPath);
}

export async function resolveEmployeeAvatarThumbUrl(avatar?: string | null) {
    if (!avatar) return null;
    if (avatar.startsWith('data:image/') || avatar.startsWith('http://') || avatar.startsWith('https://')) {
        return avatar;
    }

    const thumbPath = getEmployeeAvatarThumbStoragePath(avatar);
    if (!thumbPath || !supabaseAdmin) return resolveEmployeeAvatarUrl(avatar);

    if (await storageObjectExists(thumbPath)) {
        const { data, error } = await supabaseAdmin.storage
            .from('employee-avatars')
            .createSignedUrl(thumbPath, 10 * 60, { download: false });

        if (!error && data?.signedUrl) return data.signedUrl;
    }

    return resolveEmployeeAvatarUrl(avatar);
}

export async function withResolvedEmployeeAvatar<T extends { avatar?: string | null }>(employee: T): Promise<T & { avatarUrl?: string | null }> {
    const avatarUrl = await resolveEmployeeAvatarUrl(employee.avatar);
    return { ...employee, avatarUrl };
}

export async function persistEmployeeInlineAvatar(params: {
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
