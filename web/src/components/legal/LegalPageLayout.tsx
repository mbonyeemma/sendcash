import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import sendicashLogo from "@/assets/sendicash-logo.png";

interface LegalSection {
  title: string;
  body: string;
}

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
}

export function LegalPageLayout({ title, lastUpdated, sections }: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <Link to="/login">
            <img src={sendicashLogo} alt="SendiCash" className="h-10 object-contain" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>

        <div className="mt-8 space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                {section.body}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-12 flex flex-wrap gap-4 border-t border-border pt-6 text-sm text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground hover:underline">
            Privacy Policy
          </Link>
          <Link to="/tos" className="hover:text-foreground hover:underline">
            Terms of Service
          </Link>
          <Link to="/login" className="hover:text-foreground hover:underline">
            Sign in
          </Link>
        </footer>
      </main>
    </div>
  );
}
