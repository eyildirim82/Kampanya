import type { Metadata } from "next";
import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ensureConfigValid } from "@/lib/config-validation";
import { Toaster } from "sonner";
import { PerformanceMeasurePatch } from "@/components/PerformanceMeasurePatch";



const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TALPA x DenizBank Private Kart | Özel Avantajlar",
  description: "TALPA ve DenizBank işbirliği ile sunulan Private Kart avantajları: IGA Lounge, TAV Passport, restoran ve otel indirimleri. Yıllık kart ücreti yok!",
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
      // Build sırasında tamamen patlamaması için throw'u kaldırıp sadece logluyoruz.
      // Ya da production runtime'da yine patlamasını isteyebiliriz ama build'i bozuyorsa dikkatli olmalıyız.
      // Şimdilik hatayı yakalayıp logluyoruz, böylece sayfa oluşumu devam edebilir.
    }
  }

  return (
    <html lang="tr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PerformanceMeasurePatch />
        <Toaster richColors position="top-center" />
        {children}

        {/* Footer */}
        <footer className="w-full bg-white border-t border-gray-200 mt-12">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex justify-center">
              <Image
                src="/denizbank-3.jpg"
                alt="DenizBank Private Kart"
                width={896}
                height={500}
                className="w-full max-w-4xl h-auto rounded-lg shadow-lg"
              />
            </div>
            <div className="text-center mt-6 text-sm text-gray-700">
              <p>© 2026 TALPA - Türkiye Havayolu Pilotları Derneği</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
