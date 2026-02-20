"use client";

import { Sidebar } from "@/components/Sidebar";
import { OnboardingCheck } from "@/components/OnboardingCheck";
import { ReloadButton } from "@/components/ReloadButton";
import { useDevice } from "@/hooks/useDevice";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const { isIPad, isTouchDevice } = useDevice();
    const isDrawerMode = isIPad || isTouchDevice;

    return (
        <div className="flex min-h-screen bg-slate-50 overflow-x-hidden">
            <OnboardingCheck />
            <Sidebar />
            <ReloadButton />
            <main className={cn(
                "flex-1 min-h-screen text-lg transition-all duration-300",
                isDrawerMode ? "ml-0 pt-20 px-4" : "ml-[var(--sidebar-width,20rem)]"
            )}>
                {children}
            </main>
        </div>
    );
}
