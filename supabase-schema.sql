-- ────────────────────────────────────────────────────────────
-- SUPABASE SCHEMA MIGRATION
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/_/sql
-- ────────────────────────────────────────────────────────────

-- ── ENUMS ──────────────────────────────────────────────────

CREATE TYPE entity_type AS ENUM ('PARENT', 'SUB_BRAND');
CREATE TYPE pf_account_type AS ENUM ('INCOME', 'PROFIT', 'OWNERS_COMP', 'TAX', 'OPEX');
CREATE TYPE txn_type AS ENUM ('DEBIT', 'CREDIT');
CREATE TYPE txn_status AS ENUM ('DRAFT', 'FINALIZED', 'VOIDED');
CREATE TYPE user_role AS ENUM ('ADMIN', 'ACCOUNTS_MANAGER', 'ENTRY_MANAGER');
CREATE TYPE drawing_status AS ENUM ('PENDING', 'APPROVED', 'COMPLETED', 'REJECTED');
CREATE TYPE transfer_type AS ENUM ('LOAN', 'CAPITAL_TRANSFER');
CREATE TYPE transfer_status AS ENUM ('ACTIVE', 'REPAID', 'WRITTEN_OFF');
CREATE TYPE reconciliation_status AS ENUM ('MATCHED', 'UNMATCHED', 'DISPUTED');
CREATE TYPE currency AS ENUM ('USD', 'BDT');
CREATE TYPE bank_account_type AS ENUM ('FOREIGN_USD', 'LOCAL_USD', 'LOCAL_BDT', 'PETTY_CASH');
CREATE TYPE petty_cash_txn_type AS ENUM ('ATM_WITHDRAWAL', 'CARD_PAYMENT', 'CASH_EXPENSE', 'FLOAT_TOPUP');

-- ── USER PROFILES (Supabase Auth Extension) ───────────────

CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role user_role DEFAULT 'ENTRY_MANAGER',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- ── ENTITIES (Multi-Tenancy) ───────────────────────────────

CREATE TABLE entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  type entity_type DEFAULT 'SUB_BRAND',
  parent_id uuid REFERENCES entities(id),
  color text DEFAULT '#3B82F6',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_entities_parent_id ON entities(parent_id);

-- ── BANK ACCOUNTS ──────────────────────────────────────────

CREATE TABLE bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  account_name text NOT NULL,
  account_type bank_account_type NOT NULL,
  currency currency DEFAULT 'USD',
  bank_name text,
  account_number text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_bank_accounts_entity_id ON bank_accounts(entity_id);

-- ── OWNERSHIP REGISTRY ─────────────────────────────────────

CREATE TABLE ownership_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  owner_name text NOT NULL,
  ownership_pct numeric(5,2) NOT NULL,
  effective_from date NOT NULL,
  effective_to date,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_ownership_registry_entity_id ON ownership_registry(entity_id);

-- ── PROFIT FIRST RATIO VERSIONS ────────────────────────────

CREATE TABLE pf_ratio_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  quarter text NOT NULL,
  profit_pct numeric(5,2) NOT NULL,
  owner_comp_pct numeric(5,2) NOT NULL,
  tax_pct numeric(5,2) NOT NULL,
  opex_pct numeric(5,2) NOT NULL,
  effective_from date NOT NULL,
  effective_to date,
  is_current boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  UNIQUE(entity_id, quarter)
);

-- ── CHART OF ACCOUNTS ──────────────────────────────────────

CREATE TABLE chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  account_code text NOT NULL,
  account_name text NOT NULL,
  pf_account pf_account_type,
  account_group text NOT NULL,
  parent_account_id uuid REFERENCES chart_of_accounts(id),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(entity_id, account_code)
);

CREATE INDEX idx_chart_of_accounts_entity_id ON chart_of_accounts(entity_id);

-- ── JOURNAL ENTRIES (Double-Entry Core) ────────────────────

CREATE TABLE journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  entry_number serial UNIQUE,
  date date NOT NULL,
  description text NOT NULL,
  reference text,
  status txn_status DEFAULT 'DRAFT',
  pf_ratio_version_id uuid REFERENCES pf_ratio_versions(id),
  receipt_url text,
  category text,
  tags text[] DEFAULT '{}',
  is_split boolean DEFAULT false,
  split_parent_id uuid REFERENCES journal_entries(id),
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_by_role user_role NOT NULL,
  approved_by uuid REFERENCES profiles(id),
  voided_at timestamp with time zone,
  voided_by uuid REFERENCES profiles(id),
  void_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_journal_entries_entity_date ON journal_entries(entity_id, date DESC);
CREATE INDEX idx_journal_entries_status ON journal_entries(status);

-- ── JOURNAL ENTRY LINES ────────────────────────────────────

CREATE TABLE journal_entry_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id uuid NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES chart_of_accounts(id),
  pf_account pf_account_type,
  entry_type txn_type NOT NULL,
  amount numeric(15,2) NOT NULL,
  currency currency DEFAULT 'USD',
  entity_id uuid NOT NULL REFERENCES entities(id),
  memo text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_journal_entry_lines_journal_entry_id ON journal_entry_lines(journal_entry_id);
CREATE INDEX idx_journal_entry_lines_pf_account ON journal_entry_lines(pf_account, entity_id);

-- ── SPLIT ALLOCATIONS ──────────────────────────────────────

CREATE TABLE split_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_entry_id uuid NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  child_entity_id uuid NOT NULL REFERENCES entities(id),
  allocation_type text NOT NULL,
  allocation_value numeric(15,2) NOT NULL,
  computed_amount numeric(15,2) NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- ── DRAWINGS ───────────────────────────────────────────────

CREATE TABLE drawings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  ownership_registry_id uuid NOT NULL REFERENCES ownership_registry(id),
  source_account pf_account_type NOT NULL,
  amount numeric(15,2) NOT NULL,
  currency currency DEFAULT 'USD',
  date date NOT NULL,
  status drawing_status DEFAULT 'PENDING',
  journal_entry_id uuid REFERENCES journal_entries(id),
  note text,
  account_balance_at_draw numeric(15,2),
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamp with time zone,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_drawings_entity_date ON drawings(entity_id, date DESC);

-- ── INTER-BRAND TRANSFERS ──────────────────────────────────

CREATE TABLE inter_brand_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_entity_id uuid NOT NULL REFERENCES entities(id),
  to_entity_id uuid NOT NULL REFERENCES entities(id),
  amount numeric(15,2) NOT NULL,
  transfer_type transfer_type DEFAULT 'LOAN',
  status transfer_status DEFAULT 'ACTIVE',
  outstanding_balance numeric(15,2),
  date date NOT NULL,
  due_date date,
  note text,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT now()
);

-- ── FUND TRANSFERS ─────────────────────────────────────────

CREATE TABLE fund_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  from_account_id uuid NOT NULL REFERENCES bank_accounts(id),
  to_account_id uuid NOT NULL REFERENCES bank_accounts(id),
  amount_from numeric(15,2) NOT NULL,
  currency_from currency NOT NULL,
  amount_to numeric(15,2) NOT NULL,
  currency_to currency NOT NULL,
  exchange_rate numeric(10,4),
  date date NOT NULL,
  reference text,
  journal_entry_id uuid UNIQUE REFERENCES journal_entries(id),
  note text,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT now()
);

-- ── PETTY CASH ────────────────────────────────────────────

CREATE TABLE petty_cash_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES entities(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  float_amount numeric(15,2) DEFAULT 500,
  currency currency DEFAULT 'BDT',
  is_closed boolean DEFAULT false,
  closed_at timestamp with time zone,
  closed_by uuid REFERENCES profiles(id),
  pdf_report_url text,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(entity_id, period_start)
);

CREATE TABLE petty_cash_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL REFERENCES petty_cash_periods(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL REFERENCES entities(id),
  date date NOT NULL,
  description text NOT NULL,
  amount numeric(15,2) NOT NULL,
  currency currency DEFAULT 'BDT',
  txn_type petty_cash_txn_type DEFAULT 'CASH_EXPENSE',
  receipt_url text,
  journal_entry_id uuid REFERENCES journal_entries(id),
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT now()
);

-- ── BANK RECONCILIATION ────────────────────────────────────

CREATE TABLE bank_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES entities(id),
  statement_date date NOT NULL,
  source text NOT NULL,
  file_url text,
  total_credits numeric(15,2),
  total_debits numeric(15,2),
  currency currency DEFAULT 'USD',
  is_reconciled boolean DEFAULT false,
  uploaded_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE bank_statement_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id uuid NOT NULL REFERENCES bank_statements(id) ON DELETE CASCADE,
  date date NOT NULL,
  description text NOT NULL,
  amount numeric(15,2) NOT NULL,
  entry_type txn_type NOT NULL,
  status reconciliation_status DEFAULT 'UNMATCHED',
  matched_journal_entry_id uuid REFERENCES journal_entries(id),
  matched_at timestamp with time zone,
  matched_by uuid REFERENCES profiles(id),
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- ── USER ENTITY ACCESS ─────────────────────────────────────

CREATE TABLE user_entity_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  granted_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, entity_id)
);

-- ── AUDIT LOG ──────────────────────────────────────────────

CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  user_role user_role NOT NULL,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- ── EVIDENCE FILES ─────────────────────────────────────────

CREATE TABLE evidence_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id uuid REFERENCES journal_entries(id),
  petty_cash_entry_id uuid REFERENCES petty_cash_entries(id),
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer,
  storage_bucket text DEFAULT 'receipts',
  storage_path text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT now()
);
