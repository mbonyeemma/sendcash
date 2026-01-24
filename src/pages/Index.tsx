import { useState } from "react";
import { Header } from "@/components/landing/Header";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { Footer } from "@/components/landing/Footer";
import { AuthModal } from "@/components/auth/AuthModal";
import { Dashboard } from "@/components/dashboard/Dashboard";

const Index = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLoginClick = () => {
    setAuthMode("login");
    setAuthModalOpen(true);
  };

  const handleRegisterClick = () => {
    setAuthMode("register");
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  // Show dashboard if logged in
  if (isLoggedIn) {
    return <Dashboard onLogout={handleLogout} />;
  }

  // Show landing page
  return (
    <div className="min-h-screen bg-background">
      <Header
        onLoginClick={handleLoginClick}
        onRegisterClick={handleRegisterClick}
      />

      <HeroSection
        onLoginClick={handleLoginClick}
        onRegisterClick={handleRegisterClick}
      />

      <FeaturesSection />

      <Footer />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
};

export default Index;