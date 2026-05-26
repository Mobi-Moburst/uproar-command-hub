import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import OverviewPage from "./pages/OverviewPage";
import ClientsPage from "./pages/ClientsPage";
import PlacementsPage from "./pages/PlacementsPage";
import AwardsPage from "./pages/AwardsPage";
import WeeklyWinsPage from "./pages/WeeklyWinsPage";
import ReportersPage from "./pages/ReportersPage";
import IntelligencePage from "./pages/IntelligencePage";

import TeamsPage from "./pages/TeamsPage";
import SamplesPage from "./pages/SamplesPage";
import BriefingsPage from "./pages/BriefingsPage";
import ReportsPage from "./pages/ReportsPage";
import LoginPage from "./pages/LoginPage";
import PulsePage from "./pages/PulsePage";
import PublicReportPage from "./pages/PublicReportPage";
import AccountPage from "./pages/AccountPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/r/:slug" element={<PublicReportPage />} />
            <Route path="/" element={<ProtectedRoute><OverviewPage /></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
            <Route path="/placements" element={<ProtectedRoute><PlacementsPage /></ProtectedRoute>} />
            <Route path="/awards" element={<ProtectedRoute><AwardsPage /></ProtectedRoute>} />
            <Route path="/weekly-wins" element={<ProtectedRoute><WeeklyWinsPage /></ProtectedRoute>} />
            <Route path="/reporters" element={<ProtectedRoute><ReportersPage /></ProtectedRoute>} />
            <Route path="/intelligence" element={<ProtectedRoute><IntelligencePage /></ProtectedRoute>} />
            <Route path="/pulse" element={<ProtectedRoute><PulsePage /></ProtectedRoute>} />
            
            <Route path="/teams" element={<ProtectedRoute><TeamsPage /></ProtectedRoute>} />
            <Route path="/samples" element={<ProtectedRoute><SamplesPage /></ProtectedRoute>} />
            <Route path="/briefings" element={<ProtectedRoute><BriefingsPage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
            <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
