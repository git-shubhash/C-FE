import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { InitialRoute } from "@/components/InitialRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Pharma from "./pages/Pharma";
import Lab from "./pages/Lab";
import Radiology from "./pages/Radiology";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<InitialRoute />} />
            <Route path="/login" element={<Login />} />
            <Route path="/pharma" element={
              <ProtectedRoute allowedRoles={['pharmacy']}>
                <Pharma />
              </ProtectedRoute>
            } />
            <Route path="/lab" element={
              <ProtectedRoute allowedRoles={['laboratory']}>
                <Lab />
              </ProtectedRoute>
            } />
            <Route path="/radiology" element={
              <ProtectedRoute allowedRoles={['radiology']}>
                <Radiology />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
