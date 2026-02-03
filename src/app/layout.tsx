import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter'
});

export const metadata: Metadata = {
  metadataBase: new URL('https://kamulogstk.net'),
  title: {
    default: "KamulogSTK - Yapay Zeka Destekli STK Yönetim Platformu",
    template: "%s | KamulogSTK"
  },
  description: "Sivil toplum kuruluşları için yapay zeka destekli üye takibi, aidat yönetimi, finansal raporlama ve analiz platformu. KVKK uyumlu, güvenli ve kolay kullanım.",
  keywords: [
    "STK yönetimi",
    "dernek yönetimi",
    "vakıf yönetimi",
    "sivil toplum kuruluşu",
    "üye takibi",
    "aidat yönetimi",
    "dernek yazılımı",
    "vakıf yazılımı",
    "STK yazılımı",
    "online aidat",
    "üyelik sistemi",
    "KVKK uyumlu",
    "yapay zeka",
    "AI destekli"
  ],
  authors: [{ name: "KamulogSTK", url: "https://kamulogstk.net" }],
  creator: "KamulogSTK",
  publisher: "KamulogSTK",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "https://kamulogstk.net",
    siteName: "KamulogSTK",
    title: "KamulogSTK - Yapay Zeka Destekli STK Yönetim Platformu",
    description: "Sivil toplum kuruluşları için yapay zeka destekli üye takibi, aidat yönetimi ve finansal raporlama platformu.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "KamulogSTK - STK Yönetim Platformu",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KamulogSTK - Yapay Zeka Destekli STK Yönetim Platformu",
    description: "Sivil toplum kuruluşları için yapay zeka destekli üye takibi ve aidat yönetimi.",
    images: ["/og-image.png"],
    creator: "@kamulogstk",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "google-site-verification-code",
  },
  alternates: {
    canonical: "https://kamulogstk.net",
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={inter.variable}>
      <head>
        <link rel="icon" href="/icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <meta name="theme-color" content="#0f172a" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />

        {/* Structured Data for Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "KamulogSTK",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web",
              "description": "Sivil toplum kuruluşları için yapay zeka destekli üye takibi ve aidat yönetimi platformu",
              "url": "https://kamulogstk.net",
              "author": {
                "@type": "Organization",
                "name": "KamulogSTK"
              },
              "offers": {
                "@type": "Offer",
                "price": "299",
                "priceCurrency": "TRY"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8",
                "ratingCount": "150"
              }
            }),
          }}
        />
      </head>
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
