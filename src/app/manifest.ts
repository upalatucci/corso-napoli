import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Contadaimoku · Josho Napoli",
    short_name: "Josho Napoli",
    description:
      "Contadaimoku collettivo per il Corso Territorio Napoli · 6-8 novembre 2026 al Grand Hotel Salerno.",
    start_url: "/",
    display: "standalone",
    background_color: "#58acdb",
    theme_color: "#58acdb",
    icons: [
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
