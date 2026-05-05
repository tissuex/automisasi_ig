import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IG Auto-Poster | Dashboard",
  description:
    "Dashboard otomatis untuk menjadwalkan dan posting konten Instagram dari Google Drive.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
