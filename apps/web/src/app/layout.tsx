import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

// Loaded from local files (not next/font/google) so the app never needs a
// network call at build time - consistent with the rest of Monome running
// fully offline.
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Monome",
  description: "Local-first personal knowledge base for your AI chat history",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-mono", geistMono.variable)}>
      <body
        className={` ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NavBar />
        {/* NavBar is `fixed`, so it's removed from normal document flow and
            would otherwise render on top of every page's content. pt-14
            reserves that space (matches NavBar's actual height, see
            NAVBAR_HEIGHT_PX below) instead of overlapping it. */}
        <main className="h-[calc(100vh-3rem)] min-h-0 pt-8">{children}</main>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}