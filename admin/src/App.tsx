import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Transactions from "@/pages/Transactions";
import Users from "@/pages/Users";
import KYC from "@/pages/KYC";
import Support from "@/pages/Support";
import Referrals from "@/pages/Referrals";
import Profits from "@/pages/Profits";
import Balances from "@/pages/Balances";
import ExchangeRates from "@/pages/ExchangeRates";
import PaymentTypes from "@/pages/PaymentTypes";
import SystemUsers from "@/pages/SystemUsers";
import Settings from "@/pages/Settings";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
});

const routes: Array<[string, JSX.Element]> = [
  ["/", <Dashboard />],
  ["/transactions", <Transactions />],
  ["/users", <Users />],
  ["/kyc", <KYC />],
  ["/support", <Support />],
  ["/referrals", <Referrals />],
  ["/profits", <Profits />],
  ["/balances", <Balances />],
  ["/exchange-rates", <ExchangeRates />],
  ["/payment-types", <PaymentTypes />],
  ["/system-users", <SystemUsers />],
  ["/settings", <Settings />],
];

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster position="top-right" richColors closeButton />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            {routes.map(([path, element]) => (
              <Route
                key={path}
                path={path}
                element={
                  <ProtectedRoute>
                    <Layout>{element}</Layout>
                  </ProtectedRoute>
                }
              />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
