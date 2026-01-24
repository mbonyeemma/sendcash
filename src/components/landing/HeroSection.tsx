import { motion } from "framer-motion";
import { ArrowRight, Smartphone, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  onRegisterClick: () => void;
  onLoginClick: () => void;
}

export const HeroSection = ({ onRegisterClick, onLoginClick }: HeroSectionProps) => {
  return (
    <section className="min-h-screen pt-24 pb-16 bg-gradient-hero relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-8rem)]">
          {/* Left - Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6"
            >
              <Zap className="w-4 h-4" />
              Fast & Secure Payments
            </motion.div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
              <span className="text-gradient-gold">SendiCash</span> – Fast,
              <br />Simple, Secure
              <br />Payments
            </h1>

            <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto lg:mx-0">
              Send money, pay bills, and manage your crypto all in one place. 
              Experience the future of digital payments with lightning-fast transactions.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button variant="hero" size="xl" onClick={onRegisterClick}>
                Create Account
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button variant="heroOutline" size="xl" onClick={onLoginClick}>
                Sign In
              </Button>
            </div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center gap-6 mt-10 justify-center lg:justify-start"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="w-5 h-5 text-success" />
                <span className="text-sm">Bank-level security</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Smartphone className="w-5 h-5 text-primary" />
                <span className="text-sm">Mobile Money</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right - Crypto Card */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex justify-center lg:justify-end"
          >
            <div className="relative">
              {/* Main Card */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="bg-card rounded-2xl shadow-xl p-6 w-full max-w-sm border border-border"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-foreground">Buy & Sell Crypto</h3>
                  <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                    <span className="text-xl">💰</span>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between p-3 bg-secondary rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">₮</div>
                      <span className="font-medium text-foreground">USDT</span>
                    </div>
                    <span className="text-emerald-600 font-medium">$1.00</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-secondary rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">$</div>
                      <span className="font-medium text-foreground">USDC</span>
                    </div>
                    <span className="text-emerald-600 font-medium">$1.00</span>
                  </div>
                </div>

                <Button variant="gold" className="w-full" size="lg" onClick={onRegisterClick}>
                  Start Trading
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </motion.div>

              {/* Floating elements */}
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-4 -right-4 w-16 h-16 bg-gold rounded-2xl shadow-gold flex items-center justify-center text-2xl"
              >
                💰
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};