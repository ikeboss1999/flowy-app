import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";

import { UpdateNotification } from "@/components/UpdateNotification";
import { AuthGuard } from "@/components/AuthGuard";
import { CloudSyncModal } from "@/components/CloudSyncModal";
import { AutoRestore } from "@/components/AutoRestore";
import { InputAutoSelect } from "@/components/InputAutoSelect";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "FlowY - Construction Management",
  description: "Modern solution for construction contractors",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

import { SyncProvider } from "@/context/SyncContext";
import { SyncNotice } from "@/components/SyncNotice";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className={`${inter.variable} ${outfit.variable} antialiased font-sans`}>
        <AuthProvider>
          <NotificationProvider>
            <SyncProvider>
              <AuthGuard>
                <AutoRestore>
                  {children}
                </AutoRestore>
                <UpdateNotification />
                <CloudSyncModal />
                <InputAutoSelect />
                <SyncNotice />
              </AuthGuard>
            </SyncProvider>
          </NotificationProvider>
        </AuthProvider>
        <div id="print-portal" />
      </body>
    </html>
  );
}
