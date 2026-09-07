import { redirect } from 'next/navigation';
import { isDeveloperPageRequest } from '@/lib/admin-page-access';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    if (!(await isDeveloperPageRequest())) redirect('/');
    return children;
}
