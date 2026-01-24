import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { Nav } from "@/components/nav";
import { Toaster } from "@/components/ui/toaster";
import { PRODUCT_NAME } from "@/lib/config";

const geistSans = Geist({
  variable: "--font-geist-sans",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased dark`}
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
