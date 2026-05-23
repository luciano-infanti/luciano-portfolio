import type { Metadata, Viewport } from "next";
import { KaishiNav } from "@/components/kaishi/nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "KAISHI",
  description: "A local-first Japanese SRS tool with instant dictionary search.",
};

export const viewport: Viewport = {
  themeColor: "#18181b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <KaishiNav />
        {children}
      </body>
    </html>
  );
}
