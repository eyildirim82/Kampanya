import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { ensureConfigValid } from "@/lib/config-validation";
import { Toaster } from "sonner";
import { PerformanceMeasurePatch } from "@/components/PerformanceMeasurePatch";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "TALPA",
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
    <html lang="tr" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            const t = localStorage.getItem('theme-preference');
            const isDark = t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches);
            document.documentElement.classList.toggle('dark', isDark);
            document.documentElement.classList.toggle('light', !isDark);
          } catch(e) {}
        `}} />
      </head>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased selection:bg-primary selection:text-white min-h-screen flex flex-col`}
      >
        <ThemeProvider>
          <PerformanceMeasurePatch />
          <Toaster richColors position="top-center" />

          <AppShell>
            {children}
          </AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
