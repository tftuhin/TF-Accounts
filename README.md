# Teamosis Profit First Ledger

A production-grade, double-entry accounting system implementing the **Profit First** financial methodology for **Teamosis** (parent) and its sub-brands (**Themefisher**, **Gethugothemes**, **Zeon Studio**).

## Architecture

```
Income Flow:
  Foreign USD (Stripe/PayPal/Wise)
    → Bangladesh USD Account (DBBL)
    → Bangladesh BDT Account (conversion @ live rate)
    → Profit First Allocation (Profit | Owner's Comp | Tax | OPEX)

Petty Cash Flow:
  OPEX Account
    → Petty Cash Account (float transfer)
    → ATM Withdrawal / Card Payment
    → Physical Expense
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| Components | Custom UI system (shadcn-inspired), Recharts |
| Backend | Next.js API Routes, Server Actions |
| Database | Supabase (PostgreSQL) via Prisma ORM |
| Auth | JWT sessions (jose), bcrypt passwords |
| State | Zustand + TanStack Query (React Query) |
| Storage | Supabase Storage (receipts, statements) |

## Features

### Profit First Dashboard
- 5 dynamic PF account cards (Income, Profit, Owner's Comp, Tax, OPEX)
- Opening balance, deposits, withdrawals, real-time balance per card
- Allocation Engine — enter total income, auto-split by current quarter's ratios
- Sub-brand income vs expense charts (Recharts)
- Money flow pipeline visualization (Foreign USD → BD Bank → PF accounts)

### Fund Transfers
- Record transfers between bank accounts with exchange rate tracking
- USD → BDT conversion with live rate input
- Full transfer history with source/destination tracking

### Expenses
- Split-transaction logic across sub-brands (percentage-based)
- **Receipt upload is optional** — not mandatory for any role
- Category-based expense tracking
- Double-entry journal creation (Debit OPEX, Credit Cash)

### Petty Cash
- Monthly period management with float tracking (BDT)
- Transaction types: ATM Withdrawal, Card Payment, Cash Expense, Float Top-up
- Flow: OPEX → Petty Cash Account → ATM/Card → Expense
- Close month & generate PDF summary

### Drawings
- Distribute from Profit or Owner's Comp accounts
- **Cap warning** when drawing exceeds account balance
- Ownership registry integration (percentage-based)

### RBAC (Role-Based Access Control)

| Feature | Admin | Accounts Manager | Entry Manager |
|---------|-------|-------------------|---------------|
| Dashboard | ✅ | ✅ | ❌ |
| Fund Transfers | ✅ | ✅ | ❌ |
| Expenses | ✅ | ✅ | ✅ |
| Petty Cash | ✅ | ✅ | ✅ |
| Drawings | ✅ | ✅ | ❌ |
| Reports | ✅ | ✅ | ❌ |
| Reconciliation | ✅ | ✅ | ❌ |
| Bulk Import | ✅ | ✅ | ❌ |
| Settings | ✅ | ❌ | ❌ |
| Hard Delete | ✅ | ❌ | ❌ |
| Edit Transactions | ✅ | ✅ | ❌ |

### Data Integrity
- **Double-entry accounting** — every transaction balanced (debits = credits)
- **Quarterly ratio versioning** — Q1 reports always use Q1 ratios
- **Soft deletes only** — voided entries preserved with reason
- **Audit log** — every mutation tracked with old/new data
- **Inter-brand transfers** — loans/capital transfers not counted as OPEX

## Setup

### Prerequisites
- Node.js 18+
- Supabase project (free tier works)
- Git

### 1. Clone & Install

```bash
git clone https://github.com/your-org/teamosis-ledger.git
cd teamosis-ledger
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:
- `DATABASE_URL` — Supabase PostgreSQL connection string
- `DIRECT_URL` — Direct connection (bypasses PgBouncer)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (for file uploads)
- `AUTH_SECRET` — Random 64-char string for JWT signing

### 3. Database Setup

```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```

### 4. Supabase Storage Buckets

Create these buckets in your Supabase dashboard:
- `receipts` (private)
- `bank-statements` (private)
- `petty-cash-reports` (private)

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@teamosis.com | admin@teamosis2025 |
| Accounts Manager | accounts@teamosis.com | manager@2025 |
| Entry Manager | entry@teamosis.com | entry@2025 |

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/          # Authenticated routes (shared layout)
│   │   ├── dashboard/        # PF dashboard with charts
│   │   ├── fund-transfers/   # USD → BDT transfer management
│   │   ├── expenses/         # Expense entry with splits
│   │   ├── petty-cash/       # Petty cash with ATM flow
│   │   ├── drawings/         # Owner distributions
│   │   ├── reports/          # Ratio history, ownership registry
│   │   ├── reconciliation/   # Bank statement matching
│   │   ├── import/           # CSV bulk import
│   │   └── settings/         # Ratio management, inter-brand transfers
│   ├── login/                # Auth pages
│   └── api/                  # API routes
├── components/
│   ├── layout/               # Sidebar, TopBar, SessionProvider
│   ├── dashboard/            # PF cards, charts, allocation engine
│   └── forms/                # Shared form components
├── hooks/                    # TanStack Query hooks
├── lib/                      # Auth, Prisma, utils, store
├── types/                    # TypeScript definitions
└── prisma/
    ├── schema.prisma         # Full data model
    └── seed.ts               # Initial data
```

## Key Design Decisions

1. **Receipt uploads are optional** — any role can submit without evidence
2. **Petty cash is always in BDT** — tracks the real physical cash flow
3. **Fund transfers track exchange rates** — USD→BDT conversion recorded at point of transfer
4. **No hard deletes for non-admin** — audit trail preserved
5. **Quarterly ratios are immutable** — new quarter creates new version, old preserved
6. **Inter-brand transfers bypass OPEX** — separate accounting treatment

## License

Private — Teamosis internal use.
