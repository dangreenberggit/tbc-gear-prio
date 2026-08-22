import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App.js";
import "./styles.css";

const container = document.getElementById("root");
if (!container) throw new Error("no #root element");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A finished ranking is immutable — it is keyed by contentHash upstream
      // — so a refocus must not refetch and restart the poll animation.
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
