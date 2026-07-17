import type { Metadata } from "next";
import "./globals.css";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "HMRDTM",
  description: "Private eventinvitationer, gæstesvar og måltidsoverblik uden gæstelogin.",
  icons: {
    icon: "/icon.svg"
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="da" data-theme="dark" data-role="admin">
      <body>
        <div className="page">
          <header className="site-header">
            <a className="brand" href="/">
              <img src="/icon.svg" alt="" className="brand-icon" />
              <span>HMRDTM <small>Hvor mange er der til mad</small></span>
            </a>
            <ThemeToggle />
          </header>
          <main className="content">{children}</main>
        </div>
      </body>
    </html>
  );
}
