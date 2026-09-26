import type { Metadata } from "next";
import { cookies } from "next/headers";
import { isLang } from "@/i18n";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ServiceWorker } from "@/components/service-worker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Modern POS",
  description: "Point of Sale System",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Language of the last visit (set by the app), so the first render is already translated
  const cookie = (await cookies()).get("lang")?.value;
  const lang = isLang(cookie) ? cookie : "en";
  return (
    <html
      lang={lang}
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body
        className="min-h-screen bg-background font-sans text-foreground antialiased"
        suppressHydrationWarning
      >
        <Providers initialLang={lang}>{children}</Providers>
        <ServiceWorker />
      </body>
    </html>
  );
}
