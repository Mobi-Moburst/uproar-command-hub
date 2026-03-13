import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import OverviewPage from "./pages/OverviewPage";
import ClientsPage from "./pages/ClientsPage";
import PlacementsPage from "./pages/PlacementsPage";
import AwardsPage from "./pages/AwardsPage";
import WeeklyWinsPage from "./pages/WeeklyWinsPage";
import TeamsPage from "./pages/TeamsPage";
import ClientReportPage from "./pages/ClientReportPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/placements" element={<PlacementsPage />} />
          <Route path="/awards" element={<AwardsPage />} />
          <Route path="/weekly-wins" element={<WeeklyWinsPage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
