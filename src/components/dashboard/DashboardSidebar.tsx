import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Wallet, 
  FileText, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  LogOut,
  ArrowDownCircle,
  DollarSign,
  Building2,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import sendicashLogo from "@/assets/sendicash-logo.png";

type DashboardView = "balance" | "balances" | "deposit" | "statement" | "banks" | "settings" | "kyc";

interface DashboardSidebarProps {
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  onLogout: () => void;
}

const menuItems = [
  { id: "balance" as const, label: "Dashboard", icon: Wallet },
  { id: "balances" as const, label: "Balance", icon: DollarSign },
  { id: "deposit" as const, label: "Deposit", icon: ArrowDownCircle },
  { id: "statement" as const, label: "Statement", icon: FileText },
  { id: "kyc" as const, label: "Verification", icon: Shield },
  { id: "banks" as const, label: "Banks", icon: Building2, comingSoon: true },
  { id: "settings" as const, label: "Settings", icon: Settings },
];

export const DashboardSidebar = ({ activeView, onViewChange, onLogout }: DashboardSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 260 }}
      className="bg-card border-r border-border h-screen sticky top-0 flex flex-col"
    >
      {/* Logo */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src={sendicashLogo} 
            alt="SendiCash" 
            className={cn("object-contain", collapsed ? "w-10 h-10" : "w-32 h-12")}
          />
          {!collapsed && (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 px-1.5 py-0.5 rounded">Beta</span>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => {
          const isActive = activeView === item.id;
          const comingSoon = "comingSoon" in item && item.comingSoon;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-medium flex-1 text-left"
                >
                  {item.label}
                </motion.span>
              )}
              {!collapsed && comingSoon && (
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">COMING SOON</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-border">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="font-medium">Logout</span>}
        </button>
      </div>
    </motion.aside>
  );
};

export type { DashboardView };