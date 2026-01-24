import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Wallet, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Send, 
  FileText, 
  Settings, 
  Shield,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Waves
} from "lucide-react";
import { cn } from "@/lib/utils";

type DashboardView = "balance" | "deposit" | "withdraw" | "send" | "statement" | "settings" | "kyc";

interface DashboardSidebarProps {
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  onLogout: () => void;
}

const menuItems = [
  { id: "balance" as const, label: "Balance", icon: Wallet },
  { id: "deposit" as const, label: "Deposit", icon: ArrowDownCircle },
  { id: "withdraw" as const, label: "Withdraw", icon: ArrowUpCircle },
  { id: "send" as const, label: "Send", icon: Send },
  { id: "statement" as const, label: "Statement", icon: FileText },
  { id: "settings" as const, label: "Settings", icon: Settings },
  { id: "kyc" as const, label: "KYC / Verification", icon: Shield },
];

export const DashboardSidebar = ({ activeView, onViewChange, onLogout }: DashboardSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 280 }}
      className="bg-card border-r border-border h-screen sticky top-0 flex flex-col"
    >
      {/* Logo */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center shrink-0">
            <Waves className="w-6 h-6 text-primary-foreground" />
          </div>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-lg font-bold text-foreground"
            >
              SendWave
            </motion.span>
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
                  className="font-medium"
                >
                  {item.label}
                </motion.span>
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