// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/config"; // Or your specific font
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "BlinkChat",
  description: "Real-time attractive chat application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 1. ADD THIS: suppressHydrationWarning is required for next-themes
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange // 2. ADD THIS: helps with script errors
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}