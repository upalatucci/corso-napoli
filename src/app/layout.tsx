import type { Metadata } from "next";
import { Permanent_Marker, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const marker = Permanent_Marker({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-marker",
});

const source = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://corso-napoli.vercel.app"),
  title: "Contadaimoku & Shakubuku · Josho Napoli",
  description:
    "Percorso collettivo anonimo verso il Corso Territorio Napoli · 6-8 novembre 2026. Daimoku, Shakubuku e inviti.",
  openGraph: {
    title: "Josho Napoli · Contadaimoku",
    description: "Le onde del nostro impegno comune verso il corso territorio Napoli.",
    images: [{ url: "/wave-totem.jpg" }],
  },
  themeColor: "#2bb9e3",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className={`${marker.variable} ${source.variable} antialiased`}>{children}</body>
    </html>
  );
}
