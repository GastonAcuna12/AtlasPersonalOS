import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { QuickCaptureModal } from "@/components/QuickCaptureModal";
import { SidebarNav } from "@/components/SidebarNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Atlas OS",
  description:
    "A private personal operating system for finances, habits, academics, notes, and goals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      style={{ colorScheme: "dark" }}
    >
      <body className="min-h-full bg-[#0d0d0e] text-zinc-100 selection:bg-amber-500/30 selection:text-amber-200">
        <div className="flex min-h-screen flex-col md:flex-row">
          {/* Unified Global Sidebar */}
          <SidebarNav />

          {/* Page content main container with sticky sidebar scrolling */}
          <main className="flex-1 min-w-0 bg-[#0d0d0e] md:h-screen md:overflow-y-auto">
            {children}
          </main>
        </div>
        <QuickCaptureModal />
      </body>
    </html>
  );
}

