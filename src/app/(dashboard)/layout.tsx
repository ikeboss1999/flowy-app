import { Sidebar } from "@/components/Sidebar";
import { OnboardingCheck } from "@/components/OnboardingCheck";
import { ReloadButton } from "@/components/ReloadButton";

export default function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="flex min-h-screen bg-slate-50">
            <OnboardingCheck />
            <Sidebar />
            <ReloadButton />
            <main className="flex-1 ml-80 min-h-screen text-lg">
                {children}
            </main>
        </div>
    );
}
