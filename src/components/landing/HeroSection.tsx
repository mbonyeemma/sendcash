import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { ArrowRight, Smartphone, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fiatCurrencies, fiatToUsdRate } from "@/data/currencies";

const CARD_FIAT_IDS = ["ugx", "kes", "rwf", "tzs", "ssd"] as const;

export const HeroSection = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const cardFiats = CARD_FIAT_IDS.map((id) => fiatCurrencies.find((c) => c.id === id)).filter(Boolean);

  useEffect(() => {
    const t = setInterval(() => {
      setActiveIndex((i) => (i + 1) % cardFiats.length);
    }, 2200);
    return () => clearInterval(t);
  }, [cardFiats.length]);

  return (
    <section className="min-h-screen pt-24 pb-16 bg-gradient-hero relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 max-w-7xl">
        <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-center min-h-[calc(100vh-8rem)] py-8 lg:py-0">
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

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex justify-center lg:justify-start lg:col-span-2"
          >
            <div className="relative w-full max-w-md lg:max-w-lg">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="bg-card rounded-3xl shadow-2xl p-6 sm:p-8 w-full border border-border"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl sm:text-2xl font-semibold text-foreground">Cash-Out & Cash-In</h3>
                  <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                    <span className="text-2xl">💵</span>
                  </div>
                </div>

                <div className="space-y-3 mb-6 min-h-[200px]">
                  <AnimatePresence mode="wait">
                    {cardFiats.map(
                      (fiat, i) =>
                        fiat && i === activeIndex && (
                          <motion.div
                            key={fiat.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            transition={{ duration: 0.35 }}
                            className="flex items-center justify-between p-4 bg-secondary rounded-xl"
                          >
                            <div className="flex items-center gap-4">
                              <img src={fiat.logo} alt={fiat.symbol} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-contain" />
                              <div>
                                <span className="font-semibold text-foreground text-base sm:text-lg">{fiat.symbol}</span>
                                <p className="text-xs sm:text-sm text-muted-foreground">{fiat.name}</p>
                              </div>
                            </div>
                            <span className="text-accent font-semibold text-lg sm:text-xl">
                              ${(fiatToUsdRate[fiat.symbol] ?? 0).toFixed(4)} USD
                            </span>
                          </motion.div>
                        )
                    )}
                  </AnimatePresence>
                  <div className="flex flex-wrap gap-2 justify-center pt-2">
                    {cardFiats.map((fiat, i) => (
                      <button
                        key={fiat?.id}
                        type="button"
                        aria-label={`Show ${fiat?.symbol}`}
                        onClick={() => setActiveIndex(i)}
                        className={`w-2 h-2 rounded-full transition-colors ${i === activeIndex ? "bg-primary scale-110" : "bg-muted-foreground/40"}`}
                      />
                    ))}
                  </div>
                </div>

                <Button className="w-full h-12 sm:h-14 bg-accent hover:bg-accent/90 text-accent-foreground text-base font-semibold" asChild>
                  <Link to="/signup">
                    Get Started
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
