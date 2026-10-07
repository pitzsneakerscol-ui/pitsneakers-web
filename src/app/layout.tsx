import type { Metadata, Viewport } from "next";
import { Inter, Anton } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AnnouncementBar from "@/components/AnnouncementBar";
import { getAllGroups } from "@/lib/products";
import FloatingSearchButton from "@/components/FloatingSearchButton";
import MobileTabBar from "@/components/MobileTabBar";
import ScrollProgress from "@/components/ScrollProgress";
import { siteConfig } from "@/config/site";
import { isDbConfigured } from "@/lib/db";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
});

// viewportFit "cover": permite respetar las zonas seguras (notch, barra inferior) en celulares.
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} — Sneakers y Streetwear Verificados`,
    template: `%s — ${siteConfig.name}`,
  },
  description: siteConfig.description,
  openGraph: {
    title: `${siteConfig.name} — Sneakers y Streetwear Verificados`,
    description: siteConfig.description,
    locale: "es_CO",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Datos reales para la barra de anuncios.
  const groups = await getAllGroups();
  const latest = groups.find((g) => g.images.length > 0);

  return (
    <html
      lang="es"
      className={`${inter.variable} ${anton.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <ScrollProgress />
        <AnnouncementBar
          total={groups.length}
          latest={latest ? { name: `${latest.brand} ${latest.name}`.replace(/^(\S+) \1 /, "$1 "), slug: latest.groupSlug } : undefined}
          members={siteConfig.stats.whatsappMembers}
          communityUrl={siteConfig.whatsappCommunityUrl}
          promo={siteConfig.promo.enabled ? { title: siteConfig.promo.title, endsAt: siteConfig.promo.endsAt } : undefined}
        />
        <Navbar resellerEnabled={isDbConfigured()} />
        <main className="flex-1">{children}</main>
        <Footer />
        <FloatingSearchButton />
        <MobileTabBar sellEnabled={isDbConfigured()} />
      </body>
    </html>
  );
}
