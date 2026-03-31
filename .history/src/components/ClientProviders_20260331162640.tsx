"use client";

import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  );
}