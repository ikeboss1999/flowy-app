import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { jwtVerify, SignJWT } from 'jose';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { decryptEmployee } from '@/lib/encryption';
import { Employee } from '@/types/employee';
import { resolveEmployeeAvatarUrl } from '@/lib/employee-avatar';
import { APP_VERSION } from '@/lib/app-version';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_DAYS = 30;

let mobileJwtSecret: Uint8Array | null = null;

function getMobileJwtSecret() {
    if (mobileJwtSecret) return mobileJwtSecret;

    const isProduction = process.env.NODE_ENV === 'production';
    const rawSecret = process.env.MOBILE_JWT_SECRET || (!isProduction ? process.env.JWT_SECRET : undefined);
    if (!process.env.MOBILE_JWT_SECRET && isProduction) {
        throw new Error('FATAL: MOBILE_JWT_SECRET is required in production.');
    }

    mobileJwtSecret = new TextEncoder().encode(rawSecret || 'dev-mobile-secret-change-me-change-me');
    return mobileJwtSecret;
}

export interface MobileAccessPayload {
    typ: 'mobile-access';
    sessionId: string;
    companyOwnerId: string;
    employeeId: string;
    staffId: string;
    permissions: {
        timeTracking: boolean;
        documents: boolean;
        projectDiary: boolean;
    };
}

export function getMobileClient() {
    return supabaseAdmin || supabase;
}

export function generateRefreshSecret() {
    return crypto.randomBytes(32).toString('base64url');
}

export function buildRefreshToken(sessionId: string, secret: string) {
    return `${sessionId}.${secret}`;
}

export function parseRefreshToken(refreshToken: string) {
    const [sessionId, secret, ...rest] = refreshToken.split('.');
    if (!sessionId || !secret || rest.length > 0) return null;
    return { sessionId, secret };
}

export function getRefreshExpiry() {
    return new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export async function createMobileAccessToken(payload: MobileAccessPayload) {
    return new SignJWT(payload as any)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(ACCESS_TOKEN_TTL)
        .sign(getMobileJwtSecret());
}

export async function verifyMobileAccessToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, getMobileJwtSecret());
        if (payload.typ !== 'mobile-access') return null;
        return payload as unknown as MobileAccessPayload;
    } catch {
        return null;
    }
}

export async function getEmployeeForMobile(client: any, employeeId: string, companyOwnerId: string) {
    const { data, error } = await client
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .eq('userId', companyOwnerId)
        .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return decryptEmployee(data as Employee);
}

export function getMobilePermissions(employee: Employee) {
    return {
        timeTracking: employee.appAccess?.permissions?.timeTracking ?? true,
        documents: employee.appAccess?.permissions?.documents ?? false,
        projectDiary: employee.appAccess?.permissions?.projectDiary ?? false,
    };
}

function logMobilePermissionCheck(params: {
    employeeId: string;
    module?: keyof ReturnType<typeof getMobilePermissions>;
    tokenPermissions: MobileAccessPayload['permissions'];
    dbPermissions: ReturnType<typeof getMobilePermissions>;
}) {
    console.info('[MobileAuth]', {
        employeeId: params.employeeId,
        requestedModule: params.module || 'none',
        tokenPermissions: params.tokenPermissions,
        dbPermissions: params.dbPermissions,
        appVersion: APP_VERSION,
        nodeEnv: process.env.NODE_ENV,
    });
}

export async function resolveMobileEmployeeAvatarUrl(client: any, employee: Employee, companyOwnerId?: string) {
    const directUrl = await resolveEmployeeAvatarUrl(employee.avatar);
    if (directUrl) return directUrl;

    if (!employee.id || !companyOwnerId) return null;

    const { data, error } = await client
        .from('employees')
        .select('avatar')
        .eq('id', employee.id)
        .eq('userId', companyOwnerId)
        .maybeSingle();

    if (error) {
        console.error('[MobileAuth] avatar lookup failed:', error);
        return null;
    }

    return resolveEmployeeAvatarUrl(data?.avatar);
}

export async function sanitizeMobileEmployee(employee: Employee, client?: any, companyOwnerId?: string) {
    const avatarUrl = client
        ? await resolveMobileEmployeeAvatarUrl(client, employee, companyOwnerId || employee.userId)
        : await resolveEmployeeAvatarUrl(employee.avatar);

    return {
        id: employee.id,
        employeeNumber: employee.employeeNumber,
        avatarUrl,
        personalData: {
            firstName: employee.personalData.firstName,
            lastName: employee.personalData.lastName,
            email: employee.personalData.email,
            phone: employee.personalData.phone,
        },
        employment: {
            position: employee.employment.position,
            status: employee.employment.status,
            startDate: employee.employment.startDate,
            isActive: employee.employment.isActive,
        },
        appAccess: {
            staffId: employee.appAccess?.staffId,
            isAccessEnabled: employee.appAccess?.isAccessEnabled,
            permissions: getMobilePermissions(employee),
            lastLogin: employee.appAccess?.lastLogin,
        },
    };
}

export async function createMobileSession(params: {
    companyOwnerId: string;
    employeeId: string;
    platform?: string;
    deviceName?: string;
    appVersion?: string;
}) {
    const client = getMobileClient();
    const refreshSecret = generateRefreshSecret();
    const refreshTokenHash = await bcrypt.hash(refreshSecret, 10);
    const expiresAt = getRefreshExpiry();
    const now = new Date().toISOString();

    const { data: session, error } = await client
        .from('employee_mobile_sessions')
        .insert({
            userId: params.companyOwnerId,
            employeeId: params.employeeId,
            refreshTokenHash,
            platform: params.platform || null,
            deviceName: params.deviceName || null,
            appVersion: params.appVersion || null,
            lastSeenAt: now,
            expiresAt,
            createdAt: now,
            updatedAt: now,
        })
        .select()
        .single();

    if (error) throw error;

    return {
        session,
        refreshToken: buildRefreshToken(session.id, refreshSecret),
        expiresAt,
    };
}

export async function issueMobileTokens(params: {
    companyOwnerId: string;
    employee: Employee;
    sessionId: string;
}) {
    const accessToken = await createMobileAccessToken({
        typ: 'mobile-access',
        sessionId: params.sessionId,
        companyOwnerId: params.companyOwnerId,
        employeeId: params.employee.id,
        staffId: params.employee.appAccess?.staffId || '',
        permissions: getMobilePermissions(params.employee),
    });

    return {
        accessToken,
        tokenType: 'Bearer',
        expiresIn: 15 * 60,
    };
}

export async function requireMobileSession(request: Request, module?: keyof ReturnType<typeof getMobilePermissions>) {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';

    if (!token) {
        return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }

    const payload = await verifyMobileAccessToken(token);
    if (!payload) {
        return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }

    const client = getMobileClient();
    const { data: session, error } = await client
        .from('employee_mobile_sessions')
        .select('*')
        .eq('id', payload.sessionId)
        .eq('userId', payload.companyOwnerId)
        .eq('employeeId', payload.employeeId)
        .is('revokedAt', null)
        .gt('expiresAt', new Date().toISOString())
        .maybeSingle();

    if (error) throw error;
    if (!session) {
        return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }

    const employee = await getEmployeeForMobile(client, payload.employeeId, payload.companyOwnerId);
    if (!employee?.appAccess?.isAccessEnabled || employee.employment?.isActive === false) {
        return {
            ok: false as const,
            response: NextResponse.json({ error: 'Forbidden', reason: 'Mobile access is disabled or employee is inactive' }, { status: 403 }),
        };
    }

    const currentPermissions = getMobilePermissions(employee);
    logMobilePermissionCheck({
        employeeId: payload.employeeId,
        module,
        tokenPermissions: payload.permissions,
        dbPermissions: currentPermissions,
    });

    if (module && !currentPermissions[module]) {
        return {
            ok: false as const,
            response: NextResponse.json({ error: 'Forbidden', reason: `Module ${module} is not enabled for this employee` }, { status: 403 }),
        };
    }

    return {
        ok: true as const,
        client,
        session,
        payload,
        tokenPermissions: payload.permissions,
        permissions: currentPermissions,
        employee,
        companyOwnerId: payload.companyOwnerId,
        employeeId: payload.employeeId,
    };
}
