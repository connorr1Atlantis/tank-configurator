import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atlantis Tank Configurator",
  description: "3D tank and accessory configurator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
