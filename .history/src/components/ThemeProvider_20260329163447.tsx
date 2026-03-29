// src/components/ThemeProvider.tsx
"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: { children: React.ReactNode } & ThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false);

  // This useEffect only runs once the component is in the browser
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // During Server-Side Rendering (SSR), we just return the children.
  // This prevents the theme-detection script from being injected too early.
  if (!mounted) {
    return <>{children}</>;
  }

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}