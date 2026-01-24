import { useState } from "react";
import { motion } from "framer-motion";
import { Menu, X, Waves } from "lucide-react";
import { DashboardSidebar, type DashboardView } from "@/components/dashboard/DashboardSidebar";
import { BalanceOverview } from "@/components/dashboard/BalanceCard";
import { DepositModal } from "@/components/dashboard/DepositModal";
import { WithdrawModal } from "@/components/dashboard/WithdrawModal";
import { SendModal } from "@/components/dashboard/SendModal";
import { StatementView } from "@/components/dashboard/StatementView";
import { SettingsView } from "@/components/dashboard/SettingsView";
import { KYCView } from "@/components/dashboard/KYCView";

interface DashboardProps {
  onLogout: () => void;
}

export const Dashboard = ({ onLogout }: DashboardProps) => {
  const [activeView, setActiveView] = useState<DashboardView>("balance");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);

  const handleViewChange = (view: DashboardView) => {
    setActiveView(view);
    setMobileMenuOpen(false);
    
    // Open modals for deposit/withdraw/send
    if (view === "deposit") {
      setDepositOpen(true);
      setActiveView("balance");
    } else if (view === "withdraw") {
      setWithdrawOpen(true);
      setActiveView("balance");
    } else if (view === "send") {
      setSendOpen(true);
      setActiveView("balance");
    }
  };

  const renderContent = () => {
    switch (activeView) {
      case "balance":
        return (
          <BalanceOverview
            onDeposit={() => setDepositOpen(true)}
            onWithdraw={() => setWithdrawOpen(true)}
            onSend={() => setSendOpen(true)}
          />
        );
      case "statement":
        return <StatementView />;
      case "settings":
        return <SettingsView />;
      case "kyc":
        return <KYCView />;
      default:
        return (
          <BalanceOverview
            onDeposit={() => setDepositOpen(true)}
            onWithdraw={() => setWithdrawOpen(true)}
            onSend={() => setSendOpen(true)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <DashboardSidebar
          activeView={activeView}
          onViewChange={handleViewChange}
          onLogout={onLogout}
        />
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-card border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center">
              <Waves className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">SendWave</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-muted text-foreground"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-border bg-card"
          >
            <DashboardSidebar
              activeView={activeView}
              onViewChange={handleViewChange}
              onLogout={onLogout}
            />
          </motion.div>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:p-8 p-4 pt-20 lg:pt-8 overflow-auto">
        <motion.div
          key={activeView}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-6xl mx-auto"
        >
          {renderContent()}
        </motion.div>
      </main>

      {/* Modals */}
      <DepositModal isOpen={depositOpen} onClose={() => setDepositOpen(false)} />
      <WithdrawModal isOpen={withdrawOpen} onClose={() => setWithdrawOpen(false)} />
      <SendModal isOpen={sendOpen} onClose={() => setSendOpen(false)} />
    </div>
  );
};