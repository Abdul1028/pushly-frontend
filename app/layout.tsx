import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { Nav } from "@/components/nav";
import { Toaster } from "@/components/ui/toaster";
import { PRODUCT_NAME } from "@/lib/config";

// Geist on every platform, so the type looks identical on Windows, macOS and phones.
const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${PRODUCT_NAME} - Deployment Platform`,
  description: "Deploy your projects in seconds. Support for Create React App, Vite, Astro and more.",
};

// Draw edge to edge on notched phones; globals.css and the nav pad with env(safe-area-inset-*)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${geist.variable} ${geistMono.variable} antialiased dark`}
      >
        <Providers>
          <Nav />
          <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
