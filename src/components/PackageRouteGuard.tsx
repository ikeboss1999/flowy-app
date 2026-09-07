import { redirect } from 'next/navigation';
import { getUserSession, hasPermission } from '@/lib/auth-server';

/** Server-side guard for direct URL navigation into package-controlled areas. */
export async function PackageRouteGuard({ feature, children }: { feature: string; children: React.ReactNode }) {
    const session = await getUserSession();
    if (!session) redirect('/welcome');
    if (!hasPermission(session, `${feature}_read`)) redirect(`/dashboard?feature=${encodeURIComponent(feature)}`);
    return <>{children}</>;
}
