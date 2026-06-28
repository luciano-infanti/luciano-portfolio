import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SmoothScroll } from "@/components/smooth-scroll";
import "./globals.css";

export const metadata: Metadata = {
  title: "Luciano Infanti",
  description:
    "Portfolio of Luciano Infanti, senior product designer and code enthusiast.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SmoothScroll />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
