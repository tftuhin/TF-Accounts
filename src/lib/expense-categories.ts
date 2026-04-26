export const EXPENSE_CATEGORIES: Record<string, string[]> = {
  "Salary & HR": [
    "Full-time Salary",
    "Part-time / Hourly",
    "Freelancer Payment",
    "Contractor Payment",
    "Bonus & Incentive",
    "Staff Welfare",
  ],
  "Infrastructure & Hosting": [
    "Cloud Server (AWS / GCP / DO)",
    "CDN & Storage",
    "Database Hosting",
    "Email Hosting",
    "VPN & Security Service",
    "Monitoring & Logging",
  ],
  "Domain & SSL": [
    "Domain Registration",
    "Domain Renewal",
    "SSL Certificate",
  ],
  "Software & Subscriptions": [
    "SaaS Tools",
    "Design Tools (Figma / Adobe)",
    "Dev Tools & IDE",
    "Project Management (Jira / Notion)",
    "Communication (Slack / Zoom / Meet)",
    "Analytics Tools",
    "AI / API Credits (OpenAI / Anthropic)",
    "Version Control (GitHub / GitLab)",
    "CI/CD Tools",
  ],
  "Marketing & Ads": [
    "Google Ads",
    "Facebook / Meta Ads",
    "LinkedIn Ads",
    "SEO Tools",
    "Content & Copywriting",
    "Social Media Management",
    "Email Marketing",
    "Influencer / Affiliate",
  ],
  "Office & Operations": [
    "Office Rent",
    "Utilities — Electricity",
    "Internet & Broadband",
    "Mobile & Data",
    "Office Supplies & Stationery",
    "Furniture & Equipment",
    "Cleaning & Maintenance",
    "Security & CCTV",
  ],
  "Travel & Transport": [
    "Local Transport (Ride-share)",
    "Air Travel",
    "Hotel & Accommodation",
    "Meals & Entertainment",
    "Visa & Travel Documents",
  ],
  "Banking & Finance": [
    "Bank Service Charge",
    "Payment Gateway Fee (Stripe / PayPal / Wise)",
    "Wire / SWIFT Transfer Fee",
    "Foreign Exchange Loss",
    "Loan / EMI Repayment",
  ],
  "Legal & Compliance": [
    "Legal Consultation",
    "Accounting / Audit",
    "Trade License Renewal",
    "Tax Filing",
    "Company Registration / RJSC",
    "NBR / VAT Compliance",
  ],
  "Training & Development": [
    "Online Course & Certification",
    "Conference & Workshop",
    "Books & Learning Material",
    "Team Training",
  ],
  "Project & Client": [
    "Outsourcing / Subcontract",
    "Project-specific Tools",
    "Client Entertainment",
    "Stock Photos / Design Assets",
    "Third-party API Costs",
  ],
  "Other": [
    "Miscellaneous",
    "Emergency Expense",
    "Unclassified",
  ],
};

export const CATEGORY_KEYS = Object.keys(EXPENSE_CATEGORIES);

export function formatCategory(category: string, subcategory?: string | null) {
  if (!subcategory) return category;
  return `${category} › ${subcategory}`;
}
