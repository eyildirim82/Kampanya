import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ensureConfigValid } from "@/lib/config-validation";

// Konfigürasyon doğrulaması (sadece server-side)
if (typeof window === 'undefined') {
  ensureConfigValid();
}

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
      { url: '/icon.webp?v=2' },
      { url: '/icon.webp?v=2', type: 'image/webp' },
    ],
    apple: [
      { url: '/icon.webp?v=2' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}

        {/* Footer */}
        <footer className="w-full bg-white border-t border-gray-200 mt-12">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex justify-center">
              <img
                src="/denizbank-3.jpg"
                alt="DenizBank Private Kart"
                className="w-full max-w-4xl h-auto rounded-lg shadow-lg"
              />
            </div>
            <div className="text-center mt-6 text-sm text-gray-500">
              <p>© 2026 TALPA - Türkiye Havayolu Pilotları Derneği</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
