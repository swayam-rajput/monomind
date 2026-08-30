import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ui/theme-provider"

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
    <html lang="en" className={cn(geistMono.variable)}>
      <body
        className={` ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider 
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange>
          <NavBar />
          {/* NavBar is `fixed` (h-10 = 2.5rem = 40px). pt-10 pushes content
              below it; overflow-auto lets scrollable pages work normally while
              fixed-height children (like /chat) use h-full against this. */}
          <main className="min-h-[calc(100dvh-2.5rem)] pt-10">{children}</main>
          <Toaster position="bottom-right" />

        </ThemeProvider>
      </body>
    </html>
  );
}
