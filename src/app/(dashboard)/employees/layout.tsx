import { PackageRouteGuard } from '@/components/PackageRouteGuard';
export default function Layout({ children }: { children: React.ReactNode }) { return <PackageRouteGuard feature="employees">{children}</PackageRouteGuard>; }
