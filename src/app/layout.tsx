import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import Header from "@/components/header";
import Footer from "@/components/footer";
import AnnouncementBar from "@/components/announcement-bar";
import { SITE_ORIGIN } from "@/lib/public-names";
import { cookies } from "next/headers";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  display: "swap",
  subsets: ["latin"],
});

const title = "SnapsVault | Celestia Snapshot Marketplace";
const description =
  "A community-driven marketplace for sharing and discovering verified snapshots for the Celestia network across mainnet and testnet, published by trusted contributors.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title,
  description,
  keywords: [
    "snapsvault",
    "snapshot",
    "blockchain",
    "celestia",
    "mainnet",
    "testnet",
    "cli",
    "snapsos",
    "marketplace",
    "data availability",
    "validator",
    "node",
    "restore",
    "node operator",
    "snapshot contributor",
    "quicksync",
    "archival snapshots",
    "pruned snapshots",
    "snaps",
  ],
  authors: [{ name: "deNodes" }],
  openGraph: {
    title,
    description,
    url: "https://celestia.snapsvault.xyz",
    siteName: "SnapsVault",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SnapsVault",
      },
    ],
    locale: "en_US",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const dismissed = (await cookies()).get("sv-announce-dismissed")?.value === "1";
  const showAnnouncement = !dismissed;

  return (
    <>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${montserrat.variable} antialiased min-h-screen w-full max-w-[1390px] flex flex-col mx-auto relative celestia-theme`}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {showAnnouncement && <AnnouncementBar />}
            <Header offset={showAnnouncement} homeHref="/" />
            <main className={`${showAnnouncement ? "pt-[112px]" : "pt-[76px]"} w-full px-4`}>
              {children}
            </main>
            <Footer />
          </ThemeProvider>
        </body>
      </html>
    </>
  );
}
