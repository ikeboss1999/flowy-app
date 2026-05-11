import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { SWRProvider } from "@/components/SWRProvider";
import { UpdateNotification } from "@/components/UpdateNotification";
import { AuthGuard } from "@/components/AuthGuard";
import { InputAutoSelect } from "@/components/InputAutoSelect";
import { DisableZoom } from "@/components/DisableZoom";

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
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
  },
  themeColor: '#f8fafc',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: "FlowY",
  },
};



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className={`${inter.variable} ${outfit.variable} antialiased font-sans`}>
        <SWRProvider>
          <AuthProvider>
            <NotificationProvider>
                <UpdateNotification />
                <AuthGuard>
                  {children}
                  <InputAutoSelect />
                  <DisableZoom />
                </AuthGuard>
            </NotificationProvider>
          </AuthProvider>
        </SWRProvider>
        <div id="print-portal" />
      </body>
    </html>
  );
}
