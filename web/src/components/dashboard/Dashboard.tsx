import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Menu, X, User, LogOut, Bell, Wallet } from "lucide-react";
import { DashboardSidebar, type DashboardView } from "@/components/dashboard/DashboardSidebar";
import { BalanceOverview } from "@/components/dashboard/BalanceCard";
import { DepositModal } from "@/components/dashboard/DepositModal";
import { SendModal } from "@/components/dashboard/SendModal";
import { ConvertModal } from "@/components/dashboard/ConvertModal";
import { OfframpModal } from "@/components/dashboard/OfframpModal";
import { StatementView } from "@/components/dashboard/StatementView";
import { SettingsView } from "@/components/dashboard/SettingsView";
import { BalanceView } from "@/components/dashboard/BalanceView";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { notificationApi, Notification } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import sendicashLogo from "@/assets/sendicash-logo.png";

interface DashboardProps {
  onLogout: () => void;
}

export const Dashboard = ({ onLogout }: DashboardProps) => {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<DashboardView>("balance");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [offrampOpen, setOfframpOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  // Fetch notifications
  useEffect(() => {
    fetchNotifications();
    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      setIsLoadingNotifications(true);
      const response = await notificationApi.getNotifications();
      if (response.data) {
        setNotifications(response.data);
      }
    } catch (error: any) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

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
    setActiveView(view);
    setMobileMenuOpen(false);
    
    // Open modals for deposit
    if (view === "deposit") {
      setDepositOpen(true);
      setActiveView("balance");
    }
  };

  const renderContent = () => {
    switch (activeView) {
      case "balance":
        return (
          <div className="space-y-8">
            <BalanceOverview
              onDeposit={() => setDepositOpen(true)}
              onSend={() => setSendOpen(true)}
              onConvert={() => setConvertOpen(true)}
            />
            <StatementView />
          </div>
        );
      case "balances":
        return <BalanceView />;
      case "statement":
        return <StatementView />;
      case "settings":
        return <SettingsView />;
      default:
        return (
          <div className="space-y-8">
            <BalanceOverview
              onDeposit={() => setDepositOpen(true)}
              onSend={() => setSendOpen(true)}
              onConvert={() => setConvertOpen(true)}
            />
            <StatementView />
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
          <img src={sendicashLogo} alt="SendiCash" className="h-10 object-contain" />
          <div className="flex items-center gap-2">
            {/* Connect Wallet Button */}
            <Button
              onClick={() => setOfframpOpen(true)}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Wallet className="w-4 h-4" />
              <span className="hidden sm:inline">Connect</span>
            </Button>

            {/* Notifications */}
            <Popover open={notificationOpen} onOpenChange={setNotificationOpen}>
              <PopoverTrigger asChild>
                <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
                  <Bell className="w-5 h-5 text-foreground" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive text-destructive-foreground">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Badge>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold text-foreground">Notifications</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {isLoadingNotifications ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No notifications</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {notifications.slice(0, 10).map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                            !notification.read ? "bg-primary/5" : ""
                          }`}
                          onClick={async () => {
                            if (!notification.read) {
                              try {
                                await notificationApi.markAsRead([notification.id]);
                                setNotifications(prev =>
                                  prev.map(n =>
                                    n.id === notification.id ? { ...n, read: true } : n
                                  )
                                );
                              } catch (error) {
                                console.error("Failed to mark notification as read:", error);
                              }
                            }
                          }}
                        >
                          <div className="flex items-start gap-3">
                            {!notification.read && (
                              <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-foreground">{notification.title}</p>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{notification.message}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {new Date(notification.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="p-2 border-t border-border">
                    <button
                      onClick={() => {
                        handleViewChange("settings");
                        setNotificationOpen(false);
                      }}
                      className="w-full text-sm text-primary hover:underline text-center py-2"
                    >
                      View all notifications
                    </button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* User Avatar & Email */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1 rounded-lg hover:bg-muted transition-colors">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar || ""} alt={user?.full_name || user?.email || "User"} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  {user?.email && (
                    <span className="hidden sm:block text-sm text-muted-foreground max-w-[120px] truncate">
                      {user.email}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {user?.email && (
                  <>
                    <div className="px-2 py-1.5 text-xs text-muted-foreground border-b border-border">
                      {user.email}
                    </div>
                    <DropdownMenuSeparator />
                  </>
                )}
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
            {/* Notifications */}
            <Popover open={notificationOpen} onOpenChange={setNotificationOpen}>
              <PopoverTrigger asChild>
                <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
                  <Bell className="w-5 h-5 text-foreground" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive text-destructive-foreground">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Badge>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold text-foreground">Notifications</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {isLoadingNotifications ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No notifications</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {notifications.slice(0, 10).map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                            !notification.read ? "bg-primary/5" : ""
                          }`}
                          onClick={async () => {
                            if (!notification.read) {
                              try {
                                await notificationApi.markAsRead([notification.id]);
                                setNotifications(prev =>
                                  prev.map(n =>
                                    n.id === notification.id ? { ...n, read: true } : n
                                  )
                                );
                              } catch (error) {
                                console.error("Failed to mark notification as read:", error);
                              }
                            }
                          }}
                        >
                          <div className="flex items-start gap-3">
                            {!notification.read && (
                              <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-foreground">{notification.title}</p>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{notification.message}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {new Date(notification.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="p-2 border-t border-border">
                    <button
                      onClick={() => {
                        handleViewChange("settings");
                        setNotificationOpen(false);
                      }}
                      className="w-full text-sm text-primary hover:underline text-center py-2"
                    >
                      View all notifications
                    </button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* User Avatar & Email */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.avatar || ""} alt={user?.full_name || user?.email || "User"} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  {user?.email && (
                    <span className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {user.email}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {user?.email && (
                  <>
                    <div className="px-2 py-1.5 text-xs text-muted-foreground border-b border-border">
                      {user.email}
                    </div>
                    <DropdownMenuSeparator />
                  </>
                )}
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
        onSuccess={() => {
          // Trigger balance refresh - you might want to add a refresh callback
          window.location.reload(); // Simple refresh for now
        }}
      />
      <SendModal
        isOpen={sendOpen}
        onClose={() => setSendOpen(false)}
        onSuccess={() => {
          // Trigger balance refresh
          window.location.reload(); // Simple refresh for now
        }}
      />
      <ConvertModal isOpen={convertOpen} onClose={() => setConvertOpen(false)} />
      <OfframpModal
        isOpen={offrampOpen}
        onClose={() => setOfframpOpen(false)}
        onSuccess={() => {
          // Refresh data if needed
        }}
      />
    </div>
  );
};