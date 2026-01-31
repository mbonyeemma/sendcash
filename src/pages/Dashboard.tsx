import { useNavigate } from "react-router-dom";
import { Dashboard as DashboardComponent } from "@/components/dashboard/Dashboard";
import { useAuth } from "@/contexts/AuthContext";

const DashboardPage = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return <DashboardComponent onLogout={handleLogout} />;
};

export default DashboardPage;
