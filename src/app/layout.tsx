import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Sistem Otomatis Posting Instagram",
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
      <body style={{ fontFamily: '"Inter", "Helvetica Neue", sans-serif' }}>{children}</body>
    </html>
  );
}
