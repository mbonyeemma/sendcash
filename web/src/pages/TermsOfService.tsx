import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

const SECTIONS = [
  {
    title: "Agreement to terms",
    body: `These Terms of Service ("Terms") govern your access to and use of SendiCash services, including our website, applications, and related payment and cryptocurrency features.

By creating an account or using SendiCash, you agree to these Terms. If you do not agree, do not use the service.`,
  },
  {
    title: "Eligibility",
    body: `You must be at least 18 years old and legally able to enter a binding contract to use SendiCash. You are responsible for ensuring that your use of the service is permitted in your jurisdiction.

We may refuse, suspend, or terminate access where required by law, risk controls, or compliance obligations.`,
  },
  {
    title: "Accounts and security",
    body: `You must provide accurate registration information and keep your credentials secure. You are responsible for activity under your account.

Notify us promptly if you suspect unauthorized access. We may require identity verification (KYC) before enabling certain features or higher limits.`,
  },
  {
    title: "Services",
    body: `SendiCash may enable sending and receiving funds, mobile-money cash-in and cash-out, cryptocurrency transfers, swaps, wallet connections, statements, referrals, and related financial tools.

Features may vary by country, verification status, partner availability, and product configuration. We may add, change, or discontinue features at any time.`,
  },
  {
    title: "Transactions, fees, and limits",
    body: `Transaction amounts, exchange rates, fees, processing times, and limits may be shown before you confirm an action. Once submitted, some transactions cannot be reversed.

You are responsible for reviewing recipient details, wallet addresses, memos/tags, and network selection before confirming. Incorrect details may result in permanent loss of funds.`,
  },
  {
    title: "Cryptocurrency and wallet risks",
    body: `Cryptocurrency and blockchain transactions involve significant risk, including price volatility, network delays, failed transactions, and irreversible transfers.

When you connect a non-custodial wallet, you retain control of that wallet and are solely responsible for its security. SendiCash does not custody your private keys for connected wallets.

Digital assets and blockchain networks are not insured deposits and may not be protected by deposit insurance schemes.`,
  },
  {
    title: "Prohibited use",
    body: `You may not use SendiCash for unlawful activity, fraud, money laundering, sanctions evasion, unauthorized access, interference with the platform, or any activity that violates applicable law or these Terms.

We may investigate suspected violations and cooperate with authorities where required.`,
  },
  {
    title: "Suspension and termination",
    body: `We may suspend or terminate your account, delay transactions, or restrict features if we believe you violated these Terms, pose a compliance or security risk, or if required by law or partners.

You may stop using SendiCash at any time. Some obligations survive termination, including those relating to fees owed, disputes, and compliance records.`,
  },
  {
    title: "Disclaimers",
    body: `SendiCash is provided on an "as is" and "as available" basis. To the fullest extent permitted by law, we disclaim warranties of merchantability, fitness for a particular purpose, and non-infringement.

We do not guarantee uninterrupted service, specific exchange rates, or that transactions will complete within a particular time.`,
  },
  {
    title: "Limitation of liability",
    body: `To the fullest extent permitted by law, SendiCash and its affiliates will not be liable for indirect, incidental, special, consequential, or punitive damages, or for loss of profits, data, goodwill, or digital assets arising from your use of the service.

Our total liability for any claim relating to the service is limited to the greater of the fees you paid to SendiCash in the three months before the claim or one hundred U.S. dollars (USD $100), unless a higher minimum is required by law.`,
  },
  {
    title: "Changes to these Terms",
    body: `We may update these Terms from time to time. The updated version will be posted at /tos with a revised "Last updated" date. Continued use after changes become effective constitutes acceptance.`,
  },
  {
    title: "Contact",
    body: `Questions about these Terms may be sent to:

Email: legal@sendicash.com
Website: https://sendicash.com`,
  },
];

export default function TermsOfService() {
  return <LegalPageLayout title="Terms of Service" lastUpdated="June 24, 2026" sections={SECTIONS} />;
}
