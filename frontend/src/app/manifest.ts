import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Alpha Ledger",
    short_name: "Alpha Ledger",
    description:
      "Personal finance tracker for income, expenses, investments, reports, PDF, and XLSX exports.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    orientation: "portrait",
    icons: [
      {
        src: "/pwa-icon?size=192",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/pwa-icon?size=512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Dashboard",
        short_name: "Dashboard",
        url: "/",
      },
      {
        name: "Reports",
        short_name: "Reports",
        url: "/reports",
      },
      {
        name: "Transactions",
        short_name: "Transactions",
        url: "/transactions",
      },
    ],
  };
}
