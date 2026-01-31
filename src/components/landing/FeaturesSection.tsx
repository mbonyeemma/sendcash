import { motion } from "framer-motion";
import { Smartphone, CreditCard, Bitcoin, Send, Shield, Clock } from "lucide-react";

const features = [
  {
    icon: Smartphone,
    title: "Mobile Money",
    description: "Send and receive money via MTN, Airtel, and other mobile networks instantly.",
  },
  {
    icon: Bitcoin,
    title: "Crypto Support",
    description: "Buy, sell, and store TRON, DCS, XLUSD and other cryptocurrencies securely.",
  },
  {
    icon: CreditCard,
    title: "Multiple Currencies",
    description: "Hold and manage UGX, USD, and crypto all in one unified wallet.",
  },
  {
    icon: Send,
    title: "Instant Transfers",
    description: "Send money to anyone, anywhere with zero delays and low fees.",
  },
  {
    icon: Shield,
    title: "Bank-Level Security",
    description: "Your funds are protected with enterprise-grade encryption and 2FA.",
  },
  {
    icon: Clock,
    title: "24/7 Support",
    description: "Get help whenever you need it from our dedicated support team.",
  },
];

export const FeaturesSection = () => {
  return (
    <section id="features" className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Everything You Need in One Wallet
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From mobile money to crypto, SendWave gives you the tools to manage all your finances seamlessly.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group bg-card rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 border border-border hover:border-primary/20"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
