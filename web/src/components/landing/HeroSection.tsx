import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Smartphone, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cryptoCurrencies } from "@/data/currencies";

export const HeroSection = () => {
  return (
    <section className="min-h-screen pt-24 pb-16 bg-gradient-hero relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 max-w-7xl">
        <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-center min-h-[calc(100vh-8rem)] py-8 lg:py-0">
          {/* Left - Content (3 columns on desktop) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left lg:col-span-3"
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

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight mb-6">
              <span className="text-primary">SendiCash</span> – Fast,
              <br />Simple, Secure
              <br />Payments
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto lg:mx-0">
              Send money, pay bills, and manage your crypto all in one place. 
              Experience the future of digital payments with lightning-fast transactions.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
              <Button size="lg" asChild className="h-12 sm:h-14 px-8 text-base">
                <Link to="/signup">
                  Create Account
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="h-12 sm:h-14 px-8 text-base">
                <Link to="/login">Sign In</Link>
              </Button>
            </div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap items-center gap-4 sm:gap-6 justify-center lg:justify-start"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="w-5 h-5 text-accent" />
                <span className="text-sm sm:text-base">Bank-level security</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Smartphone className="w-5 h-5 text-primary" />
                <span className="text-sm sm:text-base">Mobile Money</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right - Crypto Card (2 columns on desktop, larger) */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex justify-center lg:justify-start lg:col-span-2"
          >
            <div className="relative w-full max-w-md lg:max-w-lg">
              {/* Main Card */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="bg-card rounded-3xl shadow-2xl p-6 sm:p-8 w-full border border-border"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl sm:text-2xl font-semibold text-foreground">Buy & Sell Crypto</h3>
                  <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                    <span className="text-2xl">💰</span>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  {cryptoCurrencies.map((token) => (
                    <div key={token.id} className="flex items-center justify-between p-4 bg-secondary rounded-xl hover:bg-secondary/80 transition-colors">
                      <div className="flex items-center gap-4">
                        <img src={token.logo} alt={token.symbol} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-contain" />
                        <div>
                          <span className="font-semibold text-foreground text-base sm:text-lg">{token.symbol}</span>
                          <p className="text-xs sm:text-sm text-muted-foreground">{token.network}</p>
                        </div>
                      </div>
                      <span className="text-accent font-semibold text-lg sm:text-xl">$1.00</span>
                    </div>
                  ))}
                </div>

                <Button className="w-full h-12 sm:h-14 bg-accent hover:bg-accent/90 text-accent-foreground text-base font-semibold" asChild>
                  <Link to="/signup">
                    Start Trading
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </Button>
              </motion.div>

              {/* Floating crypto icon */}
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-4 -right-4 w-16 h-16 sm:w-20 sm:h-20 bg-primary rounded-2xl shadow-lg flex items-center justify-center hidden sm:flex"
              >
                <img src={cryptoCurrencies[0].logo} alt="USDC" className="w-10 h-10 sm:w-12 sm:h-12" />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
