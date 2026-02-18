import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ensureConfigValid } from "@/lib/config-validation";
import { Toaster } from "sonner";
import { PerformanceMeasurePatch } from "@/components/PerformanceMeasurePatch";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AppShell } from "@/components/layout/AppShell";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
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
        className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased selection:bg-primary selection:text-white min-h-screen flex flex-col`}
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
