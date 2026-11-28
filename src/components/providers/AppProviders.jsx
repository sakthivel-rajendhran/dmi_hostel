"use client";

import React, { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { OfflineBanner } from "@/components/common/OfflineBanner.jsx";
import { IdleTimeoutProvider } from "@/components/common/IdleTimeoutProvider.jsx";
import { purgeAllBrowserStorage } from "@/lib/mock/index.js";

export function AppProviders({ children }) {
  // Purge all legacy mock browser storage on initial app launch
  useEffect(() => {
    purgeAllBrowserStorage();
  }, []);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 3, // 3 minutes
            gcTime: 1000 * 60 * 60, // 1 hour
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  // Clear query cache on user logout
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "dmi_auth_session_v2" && !e.newValue) {
        queryClient.clear();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false}>
        <IdleTimeoutProvider>
          <OfflineBanner />
          {children}
          <Toaster position="top-right" richColors closeButton />
        </IdleTimeoutProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default AppProviders;
