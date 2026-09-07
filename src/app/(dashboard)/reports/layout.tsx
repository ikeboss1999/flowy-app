import { PackageRouteGuard } from '@/components/PackageRouteGuard';
export default function Layout({ children }: { children: React.ReactNode }) { return <PackageRouteGuard feature="reports">{children}</PackageRouteGuard>; }
