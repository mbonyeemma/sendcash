import { useState } from "react";
import { motion } from "framer-motion";
import { User, Lock, Shield, Bell, ChevronRight, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

type SettingsTab = "profile" | "security" | "notifications";

export const SettingsView = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your settings have been updated successfully.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <nav className="bg-card rounded-2xl border border-border p-2 space-y-1">
            {[
              { id: "profile" as const, label: "Profile", icon: User },
              { id: "security" as const, label: "Security", icon: Lock },
              { id: "notifications" as const, label: "Notifications", icon: Bell },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === item.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
                <ChevronRight className="w-4 h-4 ml-auto" />
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border p-6"
          >
            {activeTab === "profile" && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-foreground">Profile Information</h2>

                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-10 h-10 text-primary" />
                    </div>
                    <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Profile Photo</p>
                    <p className="text-sm text-muted-foreground">JPG, PNG. Max 2MB</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Full Name</Label>
                    <Input defaultValue="John Doe" className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Email Address</Label>
                    <Input defaultValue="john@example.com" className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <Input defaultValue="+256 700 123 456" className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Country</Label>
                    <Input defaultValue="Uganda" className="mt-1.5" />
                  </div>
                </div>

                <Button onClick={handleSave}>Save Changes</Button>
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-foreground">Security Settings</h2>

                <div className="space-y-4">
                  <div>
                    <Label>Current Password</Label>
                    <Input type="password" placeholder="••••••••" className="mt-1.5" />
                  </div>
                  <div>
                    <Label>New Password</Label>
                    <Input type="password" placeholder="••••••••" className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Confirm New Password</Label>
                    <Input type="password" placeholder="••••••••" className="mt-1.5" />
                  </div>
                </div>

                <div className="border-t border-border pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Two-Factor Authentication</p>
                      <p className="text-sm text-muted-foreground">Add extra security to your account</p>
                    </div>
                    <Switch />
                  </div>
                </div>

                <Button onClick={handleSave}>Update Password</Button>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-foreground">Notification Preferences</h2>

                <div className="space-y-4">
                  {[
                    { label: "Transaction alerts", description: "Get notified for every transaction" },
                    { label: "Security alerts", description: "Important security notifications" },
                    { label: "Marketing emails", description: "Promotions and updates" },
                    { label: "SMS notifications", description: "Receive SMS for transactions" },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                      <div>
                        <p className="font-medium text-foreground">{item.label}</p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                      <Switch defaultChecked={index < 2} />
                    </div>
                  ))}
                </div>

                <Button onClick={handleSave}>Save Preferences</Button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};