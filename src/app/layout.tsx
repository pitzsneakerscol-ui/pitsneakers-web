import type { Metadata, Viewport } from "next";
import { Inter, Anton } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TopTicker from "@/components/TopTicker";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${anton.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <ScrollProgress />
        <TopTicker />
        <Navbar resellerEnabled={isDbConfigured()} />
        <main className="flex-1">{children}</main>
        <Footer />
        <FloatingSearchButton />
        <MobileTabBar sellEnabled={isDbConfigured()} />
      </body>
    </html>
  );
}
