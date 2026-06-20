import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/services/api";

export default function Logout() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Call logout API if available
        await authApi.logout();
      } catch (error) {
        // Continue with logout even if API call fails
        console.error("Logout API error:", error);
      }

      // Clear all local storage
      localStorage.clear();
      
      // Clear session storage
      sessionStorage.clear();

      // Logout from auth context
      logout();

      // Redirect to home page
      navigate("/", { replace: true });
    };

    performLogout();
  }, [logout, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Logging out...</p>
      </div>
    </div>
  );
}
