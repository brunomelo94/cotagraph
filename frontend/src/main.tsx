import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import { SidebarLayout } from "./components/SidebarLayout";
import { Dashboard } from "./pages/Dashboard";
import { Deputies } from "./pages/Deputies";
import { DeputyDetail } from "./pages/DeputyDetail";
import { GraphExplorer } from "./pages/GraphExplorer";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SidebarLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/deputies" element={<Deputies />} />
            <Route path="/deputies/:camaraId" element={<DeputyDetail />} />
            <Route path="/graph/:entityId" element={<GraphExplorer />} />
          </Routes>
        </SidebarLayout>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
