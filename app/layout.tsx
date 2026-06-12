import type { Metadata, Viewport } from "next";

import "./globals.css";

const SITE_URL = "https://wdta.app";
const SITE_NAME = "WDTA Results";
const SITE_TITLE = "WDTA Results — Waverley & District Tennis Association";
const SITE_DESCRIPTION =
  "Mobile-friendly results, ladders and match details for every WDTA (Waverley & District Tennis Association) competition — Saturday and Sunday juniors, mid-week and night tennis. Pick your section once, search any player, and check scores courtside.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "WDTA",
    "WDTA results",
    "WDTA ladder",
    "Waverley & District Tennis Association",
    "Waverley District Tennis Association",
    "Waverley Tennis",
    "Waverley tennis results",
    "junior tennis results Melbourne",
    "Saturday morning tennis",
    "tennis ladder",
    "tennis fixtures",
  ],
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: "/logo-1024.png", width: 1024, height: 1024, alt: "WDTA Results" }],
  },
  twitter: {
    card: "summary",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/logo-1024.png"],
  },
  icons: {
    icon: "/tennis-mark.svg",
    apple: "/logo-1024.png",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f5ef",
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  alternateName: ["WDTA", "Waverley & District Tennis Association Results"],
  url: SITE_URL,
  description: SITE_DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </body>
    </html>
  );
}
