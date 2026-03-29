// src/components/ThemeProvider.tsx
"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children, ...props }: any) {
  const [mounted, setMounted] = React.useState(false);

  // useEffect only runs on the client. 
  // This sets 'mounted' to true only after the page is interactive.
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // While the server is rendering, or before the client is "mounted",
  // we just render the children without the ThemeProvider wrapper.
  if (!mounted) {
    return <>{children}</>;
  }

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}