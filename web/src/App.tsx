import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThirdwebProvider } from "thirdweb/react";
import { AuthProvider } from "@/contexts/AuthContext";
import { XRPLWalletProvider } from "@/contexts/XRPLWalletContext";
import { EVMWalletProvider } from "@/contexts/EVMWalletContext";
import { SelectedChainProvider } from "@/contexts/SelectedChainContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import DashboardPage from "./pages/Dashboard";
import Logout from "./pages/Logout";
import NotFound from "./pages/NotFound";
import Index from "./pages/Index";
import Privacy from "./pages/Privacy";
import TermsOfService from "./pages/TermsOfService";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThirdwebProvider>
      <AuthProvider>
        <XRPLWalletProvider>
          <EVMWalletProvider>
            <TooltipProvider>
              <SelectedChainProvider>
                <Sonner />
                <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/tos" element={<TermsOfService />} />
                    <Route path="/logout" element={<Logout />} />
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <DashboardPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/dashboard/:view"
                      element={
                        <ProtectedRoute>
                          <DashboardPage />
                        </ProtectedRoute>
                      }
                    />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </SelectedChainProvider>
            </TooltipProvider>
          </EVMWalletProvider>
        </XRPLWalletProvider>
      </AuthProvider>
    </ThirdwebProvider>
  </QueryClientProvider>
);

export default App;
