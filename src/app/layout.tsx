import type { Metadata } from "next";
import { cookies } from "next/headers";
import { isLang } from "@/i18n";
import { Schibsted_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ServiceWorker } from "@/components/service-worker";

// Born for newsprint: sturdy figures for money, accents for French and Creole
const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Joda POS",
  description: "Point of sale and back office",
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
      className={`${schibsted.variable} antialiased`}
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
