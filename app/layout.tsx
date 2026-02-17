import type { Metadata } from "next";
// import Image from "next/image"; // Removed as old footer is being replaced
import { Inter, JetBrains_Mono } from "next/font/google"; // Changed fonts
import "./globals.css";
import { ensureConfigValid } from "@/lib/config-validation";
import { Toaster } from "sonner";
import { PerformanceMeasurePatch } from "@/components/PerformanceMeasurePatch";
import PublicHeader from "@/components/theme/PublicHeader";
import Footer from "@/components/theme/Footer";

const inter = Inter({
  variable: "--font-geist-sans", // Keeping variable name compatible with globals.css or updating globals? 
  // globals.css uses --font-geist-sans mapping. I will map Inter to it to minimize globals churn, or better, update globals mapping.
  // Actually, globals.css says: --font-sans: var(--font-geist-sans); 
  // I will just use the same variable name for now to avoid breaking other things, or better yet, I'll allow the override.
  // Let's stick to the variable name used in globals.css for less friction, OR update the variable name passed to body.
  // I'll keep the variable name '--font-geist-sans' mapped to Inter for now, effectively "aliasing" it.
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TALPA | Kampanya Portalı",
  description: "TALPA ve DenizBank işbirliği ile sunulan Private Kart avantajları.",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.webp?v=3', type: 'image/webp' },
    ],
    apple: [
      { url: '/icon.webp?v=3' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Konfigürasyon doğrulaması (sadece server-side ve ilk renderda çalışır)
  if (typeof window === 'undefined') {
    try {
      ensureConfigValid();
    } catch (error) {
      console.error("Config validation failed:", error);
    }
  }

  return (
    <html lang="tr" className="scroll-smooth">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-noise selection:bg-deniz-red selection:text-white min-h-screen flex flex-col`}
      >
        <PerformanceMeasurePatch />
        <Toaster richColors position="top-center" />

        <PublicHeader />

        <main className="flex-grow">
          {children}
        </main>

        <Footer />
      </body>
    </html>
  );
}
