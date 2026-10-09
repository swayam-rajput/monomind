import type { Metadata } from "next";
import { Aboreto, Alef, DM_Sans } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/ui/theme-provider"

// Loaded from local files (not next/font/google) so the app never needs a
// network call at build time - consistent with the rest of Monome running
// fully offline.

const alef = Alef({
  variable: '--font-alef',
  subsets: ['latin'],
  weight: "400"
});

const dm = DM_Sans({
  subsets: ['latin'],
  variable: "--font-dm",
})
export const metadata: Metadata = {
  title: "Monome",
  description: "Local-first personal knowledge base for your AI chat history",
};
const aboreto = Aboreto({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-aboreto",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn(alef.variable, dm.variable, aboreto.variable)}>
      <body
        className={` ${dm.variable} ${alef.variable} ${aboreto.variable} antialiased`}
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
          <Toaster />

        </ThemeProvider>
      </body>
    </html>
  );
}
