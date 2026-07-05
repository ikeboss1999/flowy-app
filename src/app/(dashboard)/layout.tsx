"use client";

import { Sidebar } from "@/components/Sidebar";
import { OnboardingCheck } from "@/components/OnboardingCheck";
import { ReloadButton } from "@/components/ReloadButton";
import { GlobalTodoWidget } from "@/components/GlobalTodoWidget";
import { DashboardPrefetch } from "@/components/DashboardPrefetch";
import { useDevice } from "@/hooks/useDevice";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const { isDrawerLayout } = useDevice();

    return (
        <div className="flex min-h-screen bg-slate-50 overflow-x-hidden">
            <OnboardingCheck />
            <Sidebar />
            <ReloadButton />
            <GlobalTodoWidget />
            <DashboardPrefetch />
            <main className={cn(
                "flex-1 min-h-screen text-lg transition-all duration-300",
                isDrawerLayout ? "ml-0 pt-20" : "ml-[var(--sidebar-width,20rem)] [.sidebar-collapsed_&]:ml-0"
            )}>
                {children}
            </main>
        </div>
    );
}
