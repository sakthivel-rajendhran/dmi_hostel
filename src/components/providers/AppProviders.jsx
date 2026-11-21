"use client";

import React, { useState, useEffect } from "react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { DevPanel } from "@/components/common/DevPanel.jsx";
import { OfflineBanner } from "@/components/common/OfflineBanner.jsx";
import { IdleTimeoutProvider } from "@/components/common/IdleTimeoutProvider.jsx";
import { purgeAllBrowserStorage } from "@/lib/mock/index.js";

const CACHE_STORAGE_KEY = "dmi_rq_persisted_cache";
const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export function AppProviders({ children }) {
  // Purge all mock browser storage on initial app launch
  useEffect(() => {
    purgeAllBrowserStorage();
  }, []);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 3, // 3 minutes
            gcTime: MAX_CACHE_AGE_MS,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  const [persister] = useState(() => {
    if (typeof window === "undefined") return undefined;
    return createSyncStoragePersister({
      storage: window.localStorage,
      key: CACHE_STORAGE_KEY,
    });
  });

  // Clear query cache on user logout
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "dmi_auth_session_v2" && !e.newValue) {
        queryClient.clear();
        try {
          localStorage.removeItem(CACHE_STORAGE_KEY);
        } catch (_) {}
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [queryClient]);

  // Dev-only gating
  const isDev = process.env.NODE_ENV !== "production";

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: persister || { persistClient: () => {}, restoreClient: () => {} },
        maxAge: MAX_CACHE_AGE_MS,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            // Only persist successful queries, never persist sensitive gate QR verification tokens
            return (
              query.state.status === "success" &&
              !query.queryKey.includes("gateQr") &&
              !query.queryKey.includes("session")
            );
          },
        },
      }}
    >
      <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false}>
        <IdleTimeoutProvider>
          <OfflineBanner />
          {children}
          <Toaster position="top-right" richColors closeButton />
          {isDev && <DevPanel />}
        </IdleTimeoutProvider>
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}

export default AppProviders;
