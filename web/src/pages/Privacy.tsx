import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

const SECTIONS = [
  {
    title: "Introduction",
    body: `SendiCash ("SendiCash," "we," "our," or "us") provides digital payment, remittance, and cryptocurrency services. This Privacy Policy explains how we collect, use, store, and share personal information when you use our website, mobile experiences, and related services.

By creating an account or using SendiCash, you agree to the practices described in this policy.`,
  },
  {
    title: "Information we collect",
    body: `We may collect:

• Account information: name, email address, phone number, country, and password credentials.
• Identity and compliance data: government ID, selfie or verification images, and information required for KYC/AML checks.
• Transaction data: send/receive amounts, currencies, wallet addresses, bank or mobile-money details, timestamps, and status.
• Wallet connection data: public blockchain addresses you connect (for example Base or XRPL wallets). We do not store your private keys or seed phrases.
• Technical data: IP address, browser type, device information, logs, and cookies used to operate and secure the service.
• Communications: support messages, feedback, and email verification activity.`,
  },
  {
    title: "How we use information",
    body: `We use personal information to:

• Provide, operate, and improve SendiCash services.
• Process payments, deposits, withdrawals, swaps, and related transactions.
• Verify identity, prevent fraud, and meet legal and regulatory obligations.
• Communicate with you about your account, security alerts, and service updates.
• Analyze usage to improve reliability, performance, and user experience.
• Enforce our Terms of Service and protect users and the platform.`,
  },
  {
    title: "How we share information",
    body: `We may share information with:

• Payment, banking, and mobile-money partners needed to complete transactions.
• Identity verification and compliance providers.
• Blockchain networks and wallet providers when you initiate on-chain activity.
• Infrastructure providers such as hosting, email, analytics, and security vendors.
• Regulators, law enforcement, or other parties when required by law or to protect rights and safety.

We do not sell your personal information.`,
  },
  {
    title: "Data retention and security",
    body: `We retain information for as long as needed to provide services, comply with legal obligations, resolve disputes, and enforce agreements. We apply administrative, technical, and organizational safeguards designed to protect your data. No method of transmission or storage is completely secure.`,
  },
  {
    title: "Your choices and rights",
    body: `Depending on your location, you may have rights to access, correct, delete, or restrict certain processing of your personal information. You can update some account details in Settings. For other requests, contact us using the details below.

You may opt out of non-essential marketing communications at any time.`,
  },
  {
    title: "International transfers",
    body: `SendiCash may process and store information in countries other than where you live. When we transfer data internationally, we take steps designed to ensure appropriate protection consistent with applicable law.`,
  },
  {
    title: "Children",
    body: `SendiCash is not intended for individuals under 18. We do not knowingly collect personal information from children.`,
  },
  {
    title: "Changes to this policy",
    body: `We may update this Privacy Policy from time to time. We will post the revised version on this page and update the "Last updated" date. Continued use of SendiCash after changes become effective constitutes acceptance of the updated policy.`,
  },
  {
    title: "Contact us",
    body: `Questions about this Privacy Policy or your personal data may be sent to:

Email: privacy@sendicash.com
Website: https://sendicash.com`,
  },
];

export default function Privacy() {
  return <LegalPageLayout title="Privacy Policy" lastUpdated="June 24, 2026" sections={SECTIONS} />;
}
