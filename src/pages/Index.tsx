import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/landing/Header";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { Footer } from "@/components/landing/Footer";

const Index = () => {
  const { isLoggedIn } = useAuth();

  // Redirect to dashboard if already logged in
  if (isLoggedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  // Show landing page
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <FeaturesSection />
      <Footer />
    </div>
  );
};

export default Index;