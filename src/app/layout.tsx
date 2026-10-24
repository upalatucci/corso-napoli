import type { Metadata, Viewport } from "next";
import { Bangers, Bebas_Neue, Rock_Salt, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const brush = Rock_Salt({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-brush",
});

const logo = Bangers({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-logo",
});

const caps = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-caps",
});

const source = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://corso-napoli.vercel.app"),
  title: "Contadaimoku · Josho Napoli",
  description:
    "Contadaimoku collettivo per il Corso Territorio Napoli · 6-8 novembre 2026 al Grand Hotel Salerno.",
  openGraph: {
    title: "Josho Napoli · Contadaimoku",
    description: "Le onde del nostro impegno comune verso il corso territorio Napoli.",
    images: [{ url: "/hero-wave-desktop.webp", width: 2560, height: 1360, alt: "Josho Napoli" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#58acdb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className={`${brush.variable} ${logo.variable} ${caps.variable} ${source.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
