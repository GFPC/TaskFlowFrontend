import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "next-themes";
import { ThemeSync } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth-context";
import { SWRProvider } from "@/lib/swr-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-jb-mono",
});

export const metadata: Metadata = {
  title: "TaskFlow",
  description: "Project management with task dependency graphs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <ThemeProvider attribute="class" enableSystem>
          <SWRProvider>
            <AuthProvider>
              <ThemeSync />
              {children}

              <Toaster richColors position="top-right" duration={1500} />
            </AuthProvider>
          </SWRProvider>
        </ThemeProvider>

        <Analytics />
      </body>
    </html>
  );
}
