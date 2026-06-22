import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Menu, X, User, LogOut } from "lucide-react";
import { DashboardSidebar, type DashboardView } from "@/components/dashboard/DashboardSidebar";
import { BalanceOverview } from "@/components/dashboard/BalanceCard";
import { DepositModal } from "@/components/dashboard/DepositModal";
import { SendModal } from "@/components/dashboard/SendModal";
import { SwapModal } from "@/components/dashboard/SwapModal";
import { ConnectXRPLWalletModal } from "@/components/dashboard/ConnectXRPLWalletModal";
import { StatementView } from "@/components/dashboard/StatementView";
import { SettingsView } from "@/components/dashboard/SettingsView";
import { BalanceView } from "@/components/dashboard/BalanceView";
import { KYCView } from "@/components/dashboard/KYCView";
import { ReferralsView } from "@/components/dashboard/ReferralsView";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useXRPLWallet } from "@/contexts/XRPLWalletContext";
import { useEVMWallet } from "@/contexts/EVMWalletContext";
import { cn } from "@/lib/utils";
import sendicashLogo from "@/assets/sendicash-logo.png";

interface DashboardProps {
  onLogout: () => void;
  initialView?: DashboardView;
}

export const Dashboard = ({ onLogout, initialView = "balance" }: DashboardProps) => {
  const { user } = useAuth();
  const { isConnected: xrplConnected, address: xrplAddress } = useXRPLWallet();
  const { isConnected: evmConnected, address: evmAddress } = useEVMWallet();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<DashboardView>(initialView);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [connectWalletOpen, setConnectWalletOpen] = useState(false);
  const [connectWalletTab, setConnectWalletTab] = useState<"evm" | "xrp">("evm");
  const [balanceRefreshTrigger, setBalanceRefreshTrigger] = useState(0);

  const refreshDashboardData = () => {
    setBalanceRefreshTrigger((t) => t + 1);
  };

  const openWalletModal = (tab: "evm" | "xrp") => {
    setConnectWalletTab(tab);
    setConnectWalletOpen(true);
  };

  // Sync active view with URL param changes
  useEffect(() => {
    setActiveView(initialView);
  }, [initialView]);

  // Get user initials for avatar
  const getUserInitials = () => {
    if (user?.full_name) {
      const names = user.full_name.split(" ");
      if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return user.full_name.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  const handleViewChange = (view: DashboardView) => {
    setMobileMenuOpen(false);
    
    // Open modals for deposit
    if (view === "deposit") {
      setDepositOpen(true);
      return;
    }

    setActiveView(view);
    // Update URL to reflect the current view
    const urlPath = view === "balance" ? "/dashboard" : `/dashboard/${view}`;
    navigate(urlPath, { replace: true });
  };

  const renderContent = () => {
    switch (activeView) {
      case "balance":
        return (
          <div className="space-y-8">
            <BalanceOverview
              onDeposit={() => setDepositOpen(true)}
              onSend={() => setSendOpen(true)}
              onSwap={() => setSwapOpen(true)}
              onBalanceUpdate={() => {}}
              refreshTrigger={balanceRefreshTrigger}
            />
            <StatementView refreshTrigger={balanceRefreshTrigger} />
          </div>
        );
      case "balances":
        return <BalanceView />;
      case "statement":
        return <StatementView refreshTrigger={balanceRefreshTrigger} />;
      case "banks":
        return (
          <div className="rounded-2xl border border-border bg-card p-8 text-center max-w-md mx-auto">
            <h2 className="text-xl font-semibold text-foreground mb-2">Banks</h2>
            <p className="text-muted-foreground mb-4">Send supported crypto to banks.</p>
            <Badge variant="secondary" className="text-sm">COMING SOON</Badge>
          </div>
        );
      case "kyc":
        return <KYCView />;
      case "referrals":
        return <ReferralsView />;
      case "settings":
        return <SettingsView />;
      default:
        return (
          <div className="space-y-8">
            <BalanceOverview
              onDeposit={() => setDepositOpen(true)}
              onSend={() => setSendOpen(true)}
              onSwap={() => setSwapOpen(true)}
              onBalanceUpdate={() => {}}
              refreshTrigger={balanceRefreshTrigger}
            />
            <StatementView refreshTrigger={balanceRefreshTrigger} />
          </div>
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
            <img src={sendicashLogo} alt="SendiCash" className="h-10 object-contain" />
            <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 px-1.5 py-0.5 rounded">Beta</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Dual wallet pills */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => openWalletModal("evm")}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all border",
                  evmConnected
                    ? "border-blue-400/50 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                    : "border-border text-muted-foreground hover:border-blue-400/50 hover:text-foreground"
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", evmConnected ? "bg-blue-500" : "bg-muted-foreground/40")} />
                <span>Base</span>
                {evmConnected && evmAddress && (
                  <span className="font-mono hidden sm:inline">{evmAddress.slice(0, 4)}...{evmAddress.slice(-3)}</span>
                )}
              </button>
              <button
                onClick={() => openWalletModal("xrp")}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all border",
                  xrplConnected
                    ? "border-green-400/50 bg-green-500/10 text-green-700 dark:text-green-300"
                    : "border-border text-muted-foreground hover:border-green-400/50 hover:text-foreground"
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", xrplConnected ? "bg-green-500" : "bg-muted-foreground/40")} />
                <span>XRPL</span>
                {xrplConnected && xrplAddress && (
                  <span className="font-mono hidden sm:inline">{xrplAddress.slice(0, 4)}...{xrplAddress.slice(-3)}</span>
                )}
              </button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1 rounded-lg hover:bg-muted transition-colors">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar || ""} alt={user?.full_name || user?.email || "User"} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-2 border-b border-border">
                  <div className="font-medium text-sm text-foreground truncate">
                    {user?.full_name || user?.username || "User"}
                  </div>
                  {user?.email && (
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {user.email}
                    </div>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleViewChange("settings")}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-muted text-foreground"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
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
      <main className="flex-1 flex flex-col overflow-auto w-full">
        {/* Desktop Header */}
        <div className="hidden lg:block border-b border-border bg-card">
          <div className="flex items-center justify-end p-4 pr-8 gap-3">
            {/* Dual wallet pills — desktop */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => openWalletModal("evm")}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                  evmConnected
                    ? "border-blue-400/50 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                    : "border-border text-muted-foreground hover:border-blue-400/50 hover:text-foreground"
                )}
              >
                <span className={cn("w-2 h-2 rounded-full shrink-0", evmConnected ? "bg-blue-500" : "bg-muted-foreground/40")} />
                <span>Base</span>
                {evmConnected && evmAddress && (
                  <span className="font-mono">{evmAddress.slice(0, 6)}...{evmAddress.slice(-4)}</span>
                )}
              </button>
              <button
                onClick={() => openWalletModal("xrp")}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                  xrplConnected
                    ? "border-green-400/50 bg-green-500/10 text-green-700 dark:text-green-300"
                    : "border-border text-muted-foreground hover:border-green-400/50 hover:text-foreground"
                )}
              >
                <span className={cn("w-2 h-2 rounded-full shrink-0", xrplConnected ? "bg-green-500" : "bg-muted-foreground/40")} />
                <span>XRPL</span>
                {xrplConnected && xrplAddress && (
                  <span className="font-mono">{xrplAddress.slice(0, 6)}...{xrplAddress.slice(-4)}</span>
                )}
              </button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.avatar || ""} alt={user?.full_name || user?.email || "User"} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-2 border-b border-border">
                  <div className="font-medium text-sm text-foreground truncate">
                    {user?.full_name || user?.username || "User"}
                  </div>
                  {user?.email && (
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {user.email}
                    </div>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleViewChange("settings")}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 lg:p-8 p-4 pt-20 lg:pt-8 overflow-auto">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {renderContent()}
          </motion.div>
        </div>
      </main>

      {/* Modals */}
      <DepositModal
        isOpen={depositOpen}
        onClose={() => setDepositOpen(false)}
        onSuccess={refreshDashboardData}
      />
      <SendModal
        isOpen={sendOpen}
        onClose={() => setSendOpen(false)}
        onSuccess={refreshDashboardData}
      />
      <SwapModal
        isOpen={swapOpen}
        onClose={() => setSwapOpen(false)}
        onSwapSuccess={() => setBalanceRefreshTrigger((t) => t + 1)}
      />
      <ConnectXRPLWalletModal
        isOpen={connectWalletOpen}
        onClose={() => setConnectWalletOpen(false)}
        defaultTab={connectWalletTab}
      />
    </div>
  );
};