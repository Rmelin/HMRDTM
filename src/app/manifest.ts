import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HMRDTM – Hvor mange er der til mad",
    short_name: "HMRDTM",
    description:
      "Private eventinvitationer, gæstesvar og måltidsoverblik uden gæstelogin.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#111317",
    theme_color: "#c62828",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
