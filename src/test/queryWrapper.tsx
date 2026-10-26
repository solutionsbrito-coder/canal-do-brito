import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function makeQueryWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}
