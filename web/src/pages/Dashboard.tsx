import { useNavigate, useParams } from "react-router-dom";
import { Dashboard as DashboardComponent } from "@/components/dashboard/Dashboard";
import { useAuth } from "@/contexts/AuthContext";
import type { DashboardView } from "@/components/dashboard/DashboardSidebar";

const VALID_VIEWS: DashboardView[] = ["balance", "balances", "deposit", "statement", "banks", "settings", "kyc"];

const DashboardPage = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { view } = useParams<{ view?: string }>();

  // Map URL param to DashboardView, default to "balance"
  const initialView: DashboardView =
    view && VALID_VIEWS.includes(view as DashboardView)
      ? (view as DashboardView)
      : "balance";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return <DashboardComponent onLogout={handleLogout} initialView={initialView} />;
};

export default DashboardPage;
