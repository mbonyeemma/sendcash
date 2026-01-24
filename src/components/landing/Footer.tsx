import { Waves } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-foreground text-primary-foreground py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Logo & Description */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary-foreground/10 flex items-center justify-center">
                <Waves className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">SendWave</span>
            </div>
            <p className="text-primary-foreground/70 text-sm">
              Fast, simple, and secure payments for everyone. Your gateway to the future of digital finance.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-primary-foreground/70">
              <li><a href="#about" className="hover:text-primary-foreground transition-colors">About Us</a></li>
              <li><a href="#careers" className="hover:text-primary-foreground transition-colors">Careers</a></li>
              <li><a href="#press" className="hover:text-primary-foreground transition-colors">Press</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-primary-foreground/70">
              <li><a href="#help" className="hover:text-primary-foreground transition-colors">Help Center</a></li>
              <li><a href="#contact" className="hover:text-primary-foreground transition-colors">Contact Us</a></li>
              <li><a href="#faq" className="hover:text-primary-foreground transition-colors">FAQ</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-primary-foreground/70">
              <li><a href="#terms" className="hover:text-primary-foreground transition-colors">Terms of Service</a></li>
              <li><a href="#privacy" className="hover:text-primary-foreground transition-colors">Privacy Policy</a></li>
              <li><a href="#cookies" className="hover:text-primary-foreground transition-colors">Cookie Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-primary-foreground/60 text-sm">
            © {new Date().getFullYear()} SendWave. All rights reserved.
          </p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <a href="#" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors text-sm">
              Twitter
            </a>
            <a href="#" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors text-sm">
              LinkedIn
            </a>
            <a href="#" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors text-sm">
              Facebook
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
