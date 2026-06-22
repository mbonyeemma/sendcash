import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Gift, Copy, Check, Users, Share2, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { referralApi, type ReferralInfo } from "@/services/api";

export const ReferralsView = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const res = await referralApi.getReferralInfo();
        if (res.data) setInfo(res.data);
      } catch (error: any) {
        console.error("Failed to load referrals:", error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const copy = async (value: string, which: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      toast.success(which === "code" ? "Referral code copied" : "Referral link copied");
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error("Could not copy. Please copy manually.");
    }
  };

  const share = async () => {
    if (!info) return;
    const shareData = {
      title: "Join me on SendiCash",
      text: `Sign up on SendiCash with my referral code ${info.referral_code}`,
      url: info.referral_link,
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else await copy(info.referral_link, "link");
    } catch {
      /* user cancelled share */
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const stats = info?.stats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Refer & Earn</h1>
        <p className="text-muted-foreground">Invite friends to SendiCash and earn rewards.</p>
      </div>

      {/* Rewards teaser */}
      <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
        <div>
          <p className="font-medium text-foreground">Rewards are coming soon</p>
          <p className="text-sm text-muted-foreground">
            Start inviting now — referred friends will count towards perks like <strong>zero fees</strong> once rewards launch.
          </p>
        </div>
      </div>

      {/* Code & link card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl border border-border p-6"
      >
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
            <Gift className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Your referral code</h2>
            <p className="text-muted-foreground">Share it with friends</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
            <span className="font-mono text-lg font-semibold tracking-widest text-foreground">{info?.referral_code}</span>
            <button onClick={() => info && copy(info.referral_code, "code")} className="text-muted-foreground hover:text-foreground">
              {copied === "code" ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
          <Button onClick={share} className="sm:w-auto">
            <Share2 className="w-4 h-4 mr-2" />
            Share invite
          </Button>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
          <span className="truncate text-sm text-muted-foreground">{info?.referral_link}</span>
          <button onClick={() => info && copy(info.referral_link, "link")} className="ml-2 shrink-0 text-muted-foreground hover:text-foreground">
            {copied === "link" ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Total referrals" value={stats?.total_referrals ?? 0} />
        <StatCard label="Active" value={stats?.active_referrals ?? 0} />
        <StatCard label="Commission earned" value={stats?.total_commission ?? 0} />
      </div>

      {/* Referred users */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl border border-border p-6"
      >
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">People you've referred</h3>
        </div>
        {!info?.referrals || info.referrals.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No referrals yet. Share your code to get started!</p>
        ) : (
          <div className="space-y-2">
            {info.referrals.map((r) => (
              <div key={r.referred_user_id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="font-medium text-foreground">{r.full_name || r.username || "New user"}</p>
                  <p className="text-xs text-muted-foreground">{new Date(r.referred_at).toLocaleDateString()}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${r.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
                  {r.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{Number(value).toLocaleString()}</p>
    </div>
  );
}
