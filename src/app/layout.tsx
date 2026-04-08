import type { Metadata } from "next";
import "./globals.css";
import { MobileNav } from "@/components/mobile-nav";
import { getAuthSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "引导式痛点诊断",
  description: "把模糊的一线运营问题收敛成清晰诊断。",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getAuthSession();

  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full bg-[var(--color-bg)] text-[var(--color-text)]">
        <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-24 pt-4 sm:px-6">
          {children}
        </div>
        <MobileNav isAuthenticated={Boolean(session?.user)} />
      </body>
    </html>
  );
}
