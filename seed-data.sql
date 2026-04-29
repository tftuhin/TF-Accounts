-- ────────────────────────────────────────────────────────────
-- SEED DATA - 3 MONTHS OF DEMO TRANSACTIONS WITH JOURNAL ENTRIES
-- Run this in Supabase SQL Editor after running migrations
-- ────────────────────────────────────────────────────────────

-- ── ENTITIES ──────────────────────────────────────────────

INSERT INTO entities (id, slug, name, type, parent_id, color, is_active, created_at, updated_at) VALUES
  ('ent-parent-001', 'abc-trading', 'ABC Trading Ltd', 'PARENT', NULL, '#3b82f6', true, NOW(), NOW()),
  ('ent-subbrand-001', 'xyz-services', 'XYZ Services', 'SUB_BRAND', 'ent-parent-001', '#8b5cf6', true, NOW(), NOW());

-- ── OWNERSHIP REGISTRY ────────────────────────────────────

INSERT INTO ownership_registry (id, entity_id, owner_name, ownership_pct, effective_from, effective_to, notes, created_at) VALUES
  ('own-001', 'ent-parent-001', 'Rafiqul Islam', 100, '2026-01-01', NULL, 'Parent company owner', NOW()),
  ('own-002', 'ent-subbrand-001', 'ABC Trading Ltd', 100, '2026-01-01', NULL, 'Sub-brand parent ownership', NOW());

-- ── BANK ACCOUNTS ────────────────────────────────────────

INSERT INTO bank_accounts (id, entity_id, account_name, account_type, currency, bank_name, account_number, is_active, created_at) VALUES
  ('acc-bdt-001', 'ent-parent-001', 'ABC Main BDT Account', 'LOCAL_BDT', 'BDT', 'Dhaka Bank', '****1234', true, NOW()),
  ('acc-usd-001', 'ent-parent-001', 'ABC USD Operating', 'FOREIGN_USD', 'USD', 'Standard Chartered', '****5678', true, NOW()),
  ('acc-bdt-002', 'ent-subbrand-001', 'XYZ BDT Account', 'LOCAL_BDT', 'BDT', 'Jamuna Bank', '****9012', true, NOW());

-- ── CHART OF ACCOUNTS FOR ABC TRADING LTD ────────────────

INSERT INTO chart_of_accounts (id, entity_id, account_code, account_name, account_group, is_active, created_at) VALUES
  -- Assets
  ('coa-1001', 'ent-parent-001', '1001', 'Dhaka Bank BDT', 'asset', true, NOW()),
  ('coa-1002', 'ent-parent-001', '1002', 'Standard Chartered USD', 'asset', true, NOW()),
  ('coa-1003', 'ent-parent-001', '1003', 'Petty Cash', 'asset', true, NOW()),
  -- Liabilities
  ('coa-2001', 'ent-parent-001', '2001', 'Salary Payable', 'liability', true, NOW()),
  -- Equity
  ('coa-3001', 'ent-parent-001', '3001', 'Owners Capital', 'equity', true, NOW()),
  ('coa-3002', 'ent-parent-001', '3002', 'Owners Drawings', 'equity', true, NOW()),
  -- Expenses
  ('coa-4001', 'ent-parent-001', '4001', 'Salaries & Wages', 'expense', true, NOW()),
  ('coa-4002', 'ent-parent-001', '4002', 'Office Supplies', 'expense', true, NOW()),
  ('coa-4003', 'ent-parent-001', '4003', 'Office Rent', 'expense', true, NOW()),
  ('coa-4004', 'ent-parent-001', '4004', 'Utilities', 'expense', true, NOW()),
  ('coa-4005', 'ent-parent-001', '4005', 'Travel & Transport', 'expense', true, NOW()),
  ('coa-4006', 'ent-parent-001', '4006', 'Meals & Entertainment', 'expense', true, NOW()),
  ('coa-4007', 'ent-parent-001', '4007', 'Courier & Shipping', 'expense', true, NOW()),
  ('coa-4008', 'ent-parent-001', '4008', 'Internet & Communications', 'expense', true, NOW()),
  ('coa-4009', 'ent-parent-001', '4009', 'Maintenance & Repairs', 'expense', true, NOW());

-- ── CHART OF ACCOUNTS FOR XYZ SERVICES ────────────────────

INSERT INTO chart_of_accounts (id, entity_id, account_code, account_name, account_group, is_active, created_at) VALUES
  -- Assets
  ('coa-5001', 'ent-subbrand-001', '1001', 'Jamuna Bank BDT', 'asset', true, NOW()),
  ('coa-5002', 'ent-subbrand-001', '1003', 'Petty Cash', 'asset', true, NOW()),
  -- Liabilities
  ('coa-5003', 'ent-subbrand-001', '2001', 'Salary Payable', 'liability', true, NOW()),
  -- Equity
  ('coa-5004', 'ent-subbrand-001', '3001', 'Owners Capital', 'equity', true, NOW()),
  -- Expenses
  ('coa-5005', 'ent-subbrand-001', '4001', 'Salaries & Wages', 'expense', true, NOW()),
  ('coa-5006', 'ent-subbrand-001', '4002', 'Office Supplies', 'expense', true, NOW()),
  ('coa-5007', 'ent-subbrand-001', '4003', 'Office Rent', 'expense', true, NOW()),
  ('coa-5008', 'ent-subbrand-001', '4004', 'Utilities', 'expense', true, NOW()),
  ('coa-5009', 'ent-subbrand-001', '4005', 'Travel & Transport', 'expense', true, NOW()),
  ('coa-5010', 'ent-subbrand-001', '4006', 'Meals & Entertainment', 'expense', true, NOW()),
  ('coa-5011', 'ent-subbrand-001', '4007', 'Courier & Shipping', 'expense', true, NOW()),
  ('coa-5012', 'ent-subbrand-001', '4008', 'Internet & Communications', 'expense', true, NOW()),
  ('coa-5013', 'ent-subbrand-001', '4009', 'Maintenance & Repairs', 'expense', true, NOW());

-- ── EMPLOYEES ────────────────────────────────────────────

INSERT INTO employees (id, name, designation, department, base_salary, status, joined_at, resigned_at, created_by, created_at, updated_at) VALUES
  ('emp-001', 'Md. Hassan', 'Operations Manager', 'Operations', 50000, 'ACTIVE', '2023-01-15', NULL, NULL, NOW(), NOW()),
  ('emp-002', 'Ayesha Khan', 'Accountant', 'Finance', 35000, 'ACTIVE', '2023-06-01', NULL, NULL, NOW(), NOW()),
  ('emp-003', 'Rahman Ahmed', 'Sales Executive', 'Sales', 40000, 'ACTIVE', '2022-03-10', NULL, NULL, NOW(), NOW());

-- ── SALARY RECORDS (3 months × 3 employees × 2 records) ────

INSERT INTO salaries (id, employee_id, employee_name, amount, adjustment, adjustment_note, pay_period, date, created_by, created_at) VALUES
  ('sal-feb-001', 'emp-001', 'Md. Hassan', 50000, 2500, 'Monthly performance bonus', '2026-02', '2026-02-15', NULL, NOW()),
  ('sal-feb-002', 'emp-001', 'Md. Hassan', 25000, NULL, 'Salary advance', '2026-02', '2026-02-01', NULL, NOW()),
  ('sal-feb-003', 'emp-002', 'Ayesha Khan', 35000, 1750, 'Monthly performance bonus', '2026-02', '2026-02-15', NULL, NOW()),
  ('sal-feb-004', 'emp-002', 'Ayesha Khan', 17500, NULL, 'Salary advance', '2026-02', '2026-02-01', NULL, NOW()),
  ('sal-feb-005', 'emp-003', 'Rahman Ahmed', 40000, 2000, 'Monthly performance bonus', '2026-02', '2026-02-15', NULL, NOW()),
  ('sal-feb-006', 'emp-003', 'Rahman Ahmed', 20000, NULL, 'Salary advance', '2026-02', '2026-02-01', NULL, NOW()),
  ('sal-mar-001', 'emp-001', 'Md. Hassan', 50000, 2500, 'Monthly performance bonus', '2026-03', '2026-03-15', NULL, NOW()),
  ('sal-mar-002', 'emp-001', 'Md. Hassan', 25000, NULL, 'Salary advance', '2026-03', '2026-03-01', NULL, NOW()),
  ('sal-mar-003', 'emp-002', 'Ayesha Khan', 35000, 1750, 'Monthly performance bonus', '2026-03', '2026-03-15', NULL, NOW()),
  ('sal-mar-004', 'emp-002', 'Ayesha Khan', 17500, NULL, 'Salary advance', '2026-03', '2026-03-01', NULL, NOW()),
  ('sal-mar-005', 'emp-003', 'Rahman Ahmed', 40000, 2000, 'Monthly performance bonus', '2026-03', '2026-03-15', NULL, NOW()),
  ('sal-mar-006', 'emp-003', 'Rahman Ahmed', 20000, NULL, 'Salary advance', '2026-03', '2026-03-01', NULL, NOW()),
  ('sal-apr-001', 'emp-001', 'Md. Hassan', 50000, 2500, 'Monthly performance bonus', '2026-04', '2026-04-15', NULL, NOW()),
  ('sal-apr-002', 'emp-001', 'Md. Hassan', 25000, NULL, 'Salary advance', '2026-04', '2026-04-01', NULL, NOW()),
  ('sal-apr-003', 'emp-002', 'Ayesha Khan', 35000, 1750, 'Monthly performance bonus', '2026-04', '2026-04-15', NULL, NOW()),
  ('sal-apr-004', 'emp-002', 'Ayesha Khan', 17500, NULL, 'Salary advance', '2026-04', '2026-04-01', NULL, NOW()),
  ('sal-apr-005', 'emp-003', 'Rahman Ahmed', 40000, 2000, 'Monthly performance bonus', '2026-04', '2026-04-15', NULL, NOW()),
  ('sal-apr-006', 'emp-003', 'Rahman Ahmed', 20000, NULL, 'Salary advance', '2026-04', '2026-04-01', NULL, NOW());

-- ── SALARY INCREMENTS ────────────────────────────────────

INSERT INTO salary_increments (id, employee_id, previous_salary, new_salary, effective_date, reason, created_by, created_at) VALUES
  ('inc-001', 'emp-001', 50000, 52000, '2026-02-01', 'Annual review', NULL, NOW()),
  ('inc-002', 'emp-002', 35000, 37000, '2026-04-15', 'Promotion', NULL, NOW());

-- ── PETTY CASH PERIODS ───────────────────────────────────

INSERT INTO petty_cash_periods (id, entity_id, period_start, period_end, float_amount, currency, is_closed, created_at) VALUES
  ('pcp-feb', 'ent-subbrand-001', '2026-02-01', '2026-02-28', 15000, 'BDT', false, NOW()),
  ('pcp-mar', 'ent-subbrand-001', '2026-03-01', '2026-03-31', 15000, 'BDT', false, NOW()),
  ('pcp-apr', 'ent-subbrand-001', '2026-04-01', '2026-04-30', 15000, 'BDT', false, NOW());

-- ── PETTY CASH ENTRIES (12 types × 3 months = 36 entries) ──

INSERT INTO petty_cash_entries (id, period_id, entity_id, date, description, amount, currency, txn_type, created_by, created_at) VALUES
  ('pce-feb-01', 'pcp-feb', 'ent-subbrand-001', '2026-02-01', 'Office supplies', 1250, 'BDT', 'CASH_EXPENSE', NULL, NOW()),
  ('pce-feb-02', 'pcp-feb', 'ent-subbrand-001', '2026-02-03', 'Printer cartridges', 2450, 'BDT', 'CASH_EXPENSE', NULL, NOW()),
  ('pce-feb-03', 'pcp-feb', 'ent-subbrand-001', '2026-02-05', 'Team lunch', 3200, 'BDT', 'CASH_EXPENSE', NULL, NOW()),
  ('pce-feb-04', 'pcp-feb', 'ent-subbrand-001', '2026-02-07', 'Office snacks', 1800, 'BDT', 'CASH_EXPENSE', NULL, NOW()),
  ('pce-feb-05', 'pcp-feb', 'ent-subbrand-001', '2026-02-09', 'Courier charges', 850, 'BDT', 'CASH_EXPENSE', NULL, NOW()),
  ('pce-feb-06', 'pcp-feb', 'ent-subbrand-001', '2026-02-11', 'Local delivery', 600, 'BDT', 'CASH_EXPENSE', NULL, NOW()),
  ('pce-feb-07', 'pcp-feb', 'ent-subbrand-001', '2026-02-13', 'Internet bill', 1500, 'BDT', 'CASH_EXPENSE', NULL, NOW()),
  ('pce-feb-08', 'pcp-feb', 'ent-subbrand-001', '2026-02-15', 'Electricity top-up', 2000, 'BDT', 'CASH_EXPENSE', NULL, NOW()),
  ('pce-feb-09', 'pcp-feb', 'ent-subbrand-001', '2026-02-17', 'Taxi/transport', 950, 'BDT', 'CASH_EXPENSE', NULL, NOW()),
  ('pce-feb-10', 'pcp-feb', 'ent-subbrand-001', '2026-02-19', 'Parking and fuel', 1300, 'BDT', 'CASH_EXPENSE', NULL, NOW()),
  ('pce-feb-11', 'pcp-feb', 'ent-subbrand-001', '2026-02-21', 'Office rent advance', 5000, 'BDT', 'CASH_EXPENSE', NULL, NOW()),
  ('pce-feb-12', 'pcp-feb', 'ent-subbrand-001', '2026-02-23', 'Maintenance supplies', 2200, 'BDT', 'CASH_EXPENSE', NULL, NOW()),
  ('pce-mar-01', 'pcp-mar', 'ent-subbrand-001', '2026-03-01', 'Office supplies', 1250, 'BDT', 'CASH_EXPENSE', NULL, NOW()),
  ('pce-mar-02', 'pcp-mar', 'ent-subbrand-001', '2026-03-03', 'Printer cartridges', 2450, 'BDT', 'CASH_EXPENSE', NULL, NOW()),
  ('pce-mar-03', 'pcp-mar', 'ent-subbrand-001', '2026-03-05', 'Team lunch', 3200, 'BDT', 'CASH_EXPENSE', NULL, NOW()),
  ('pce-mar-04', 'pcp-mar', 'ent-subbrand-001', '2026-03-07', 'Office snacks', 1800, 'BDT', 'CASH_EXPENSE', NULL, NOW()),
  ('pce-mar-05', 'pcp-mar', 'ent-subbrand-001', '2026-03-09', 'Courier charges', 850, 'BDT', 'CASH_EXPENSE', NULL, NOW()),
  ('pce-mar-06', 'pcp-mar', 'ent-subbrand-001', '2026-03-11', 'Local delivery', 600, 'BDT', 'CASH_EXPENSE', NULL, NOW()),
  ('pce-mar-07', 'pcp-mar', 'ent-subbrand-001', '2026-03-13', 'Internet bill', 1500, 'BDT', 'CASH_EXPENSE', NULL, NOW()),
  ('pce-mar-08', 'pcp-mar', 'ent-subbrand-001', '2026-03-15', 'Electricity top-up', 2000, 'BDT', 'CASH_EXPENSE', NULL, NOW()),
  ('pce-mar-09', 'pcp-mar', 'ent-subbrand-001', '2026-03-17', 'Taxi/transport', 950, 'BDT', 'CASH_EXPENSE', NULL, NOW()),
  ('pce-mar-10', 'pcp-mar', 'ent-subbrand-001', '2026-03-19', 'Parking and fuel', 1300, 'BDT', 'CASH_EXPENSE', NULL, NOW()),
  ('pce-mar-11', 'pcp-mar', 'ent-subbrand-001', '2026-03-21', 'Office rent advance', 5000, 'BDT', 'CASH_EXPENSE', NULL, NOW()),
  ('pce-mar-12', 'pcp-mar', 'ent-subbrand-001', '2026-03-23', 'Maintenance supplies', 2200, 'BDT', 'CASH_EXPENSE', NULL, NOW()),
  ('pce-apr-01', 'pcp-apr', 'ent-subbrand-001', '2026-04-01', 'Office supplies', 1250, 'BDT', 'CASH_EXPENSE', NULL, NOW()),
  ('pce-apr-02', 'pcp-apr', 'ent-subbrand-001', '2026-04-03', 'Printer cartridges', 2450, 'BDT', 'CASH_EXPENSE', NULL, NOW()),
  ('pce-apr-03', 'pcp-apr', 'ent-subbrand-001', '2026-04-05', 'Team lunch', 3200, 'BDT', 'CASH_EXPENSE', NULL, NOW()),
  ('pce-apr-04', 'pcp-apr', 'ent-subbrand-001', '2026-04-07', 'Office snacks', 1800, 'BDT', 'CASH_EXPENSE', NULL, NOW()),
  ('pce-apr-05', 'pcp-apr', 'ent-subbrand-001', '2026-04-09', 'Courier charges', 850, 'BDT', 'CASH_EXPENSE', NULL, NOW()),
  ('pce-apr-06', 'pcp-apr', 'ent-subbrand-001', '2026-04-11', 'Local delivery', 600, 'BDT', 'CASH_EXPENSE', NULL, NOW()),
  ('pce-apr-07', 'pcp-apr', 'ent-subbrand-001', '2026-04-13', 'Internet bill', 1500, 'BDT', 'CASH_EXPENSE', NULL, NOW()),
  ('pce-apr-08', 'pcp-apr', 'ent-subbrand-001', '2026-04-15', 'Electricity top-up', 2000, 'BDT', 'CASH_EXPENSE', NULL, NOW()),
  ('pce-apr-09', 'pcp-apr', 'ent-subbrand-001', '2026-04-17', 'Taxi/transport', 950, 'BDT', 'CASH_EXPENSE', NULL, NOW()),
  ('pce-apr-10', 'pcp-apr', 'ent-subbrand-001', '2026-04-19', 'Parking and fuel', 1300, 'BDT', 'CASH_EXPENSE', NULL, NOW()),
  ('pce-apr-11', 'pcp-apr', 'ent-subbrand-001', '2026-04-21', 'Office rent advance', 5000, 'BDT', 'CASH_EXPENSE', NULL, NOW()),
  ('pce-apr-12', 'pcp-apr', 'ent-subbrand-001', '2026-04-23', 'Maintenance supplies', 2200, 'BDT', 'CASH_EXPENSE', NULL, NOW());

-- ── FUND TRANSFERS (6 total - 2 per month) ────────────────

INSERT INTO fund_transfers (id, entity_id, from_account_id, to_account_id, amount_from, currency_from, amount_to, currency_to, exchange_rate, date, reference, note, created_by, created_at) VALUES
  ('ft-feb-001', 'ent-parent-001', 'acc-bdt-001', 'acc-usd-001', 50000, 'BDT', 410, 'USD', 121.95, '2026-02-07', 'FT-2026-02-001', 'Monthly fund transfer', NULL, NOW()),
  ('ft-feb-002', 'ent-parent-001', 'acc-usd-001', 'acc-bdt-001', 200, 'USD', 24390, 'BDT', 121.95, '2026-02-20', 'FT-2026-02-002', 'Return transfer', NULL, NOW()),
  ('ft-mar-001', 'ent-parent-001', 'acc-bdt-001', 'acc-usd-001', 50000, 'BDT', 410, 'USD', 121.95, '2026-03-07', 'FT-2026-03-001', 'Monthly fund transfer', NULL, NOW()),
  ('ft-mar-002', 'ent-parent-001', 'acc-usd-001', 'acc-bdt-001', 200, 'USD', 24390, 'BDT', 121.95, '2026-03-20', 'FT-2026-03-002', 'Return transfer', NULL, NOW()),
  ('ft-apr-001', 'ent-parent-001', 'acc-bdt-001', 'acc-usd-001', 50000, 'BDT', 410, 'USD', 121.95, '2026-04-07', 'FT-2026-04-001', 'Monthly fund transfer', NULL, NOW()),
  ('ft-apr-002', 'ent-parent-001', 'acc-usd-001', 'acc-bdt-001', 200, 'USD', 24390, 'BDT', 121.95, '2026-04-20', 'FT-2026-04-002', 'Return transfer', NULL, NOW());

-- ── BANK STATEMENTS (6 total - 2 per month) ──────────────

INSERT INTO bank_statements (id, entity_id, statement_date, source, total_credits, total_debits, currency, is_reconciled, uploaded_by, created_at) VALUES
  ('bs-feb-001', 'ent-parent-001', '2026-02-10', 'Dhaka Bank', 150000, 120000, 'BDT', false, NULL, NOW()),
  ('bs-feb-002', 'ent-parent-001', '2026-02-25', 'Standard Chartered', 2500, 1800, 'USD', false, NULL, NOW()),
  ('bs-mar-001', 'ent-parent-001', '2026-03-10', 'Dhaka Bank', 150000, 120000, 'BDT', false, NULL, NOW()),
  ('bs-mar-002', 'ent-parent-001', '2026-03-25', 'Standard Chartered', 2500, 1800, 'USD', false, NULL, NOW()),
  ('bs-apr-001', 'ent-parent-001', '2026-04-10', 'Dhaka Bank', 150000, 120000, 'BDT', false, NULL, NOW()),
  ('bs-apr-002', 'ent-parent-001', '2026-04-25', 'Standard Chartered', 2500, 1800, 'USD', false, NULL, NOW());

-- ── BANK STATEMENT ITEMS (12 items - 2 per statement) ─────

INSERT INTO bank_statement_items (id, statement_id, date, description, amount, entry_type, status, created_at) VALUES
  ('bsi-feb-001', 'bs-feb-001', '2026-02-05', 'Deposit from sales', 75000, 'DEBIT', 'MATCHED', NOW()),
  ('bsi-feb-002', 'bs-feb-001', '2026-02-10', 'Salary payment', 125000, 'CREDIT', 'UNMATCHED', NOW()),
  ('bsi-feb-003', 'bs-feb-002', '2026-02-15', 'International payment', 1500, 'DEBIT', 'MATCHED', NOW()),
  ('bsi-mar-001', 'bs-mar-001', '2026-03-05', 'Deposit from sales', 75000, 'DEBIT', 'MATCHED', NOW()),
  ('bsi-mar-002', 'bs-mar-001', '2026-03-10', 'Salary payment', 125000, 'CREDIT', 'UNMATCHED', NOW()),
  ('bsi-mar-003', 'bs-mar-002', '2026-03-15', 'International payment', 1500, 'DEBIT', 'MATCHED', NOW()),
  ('bsi-apr-001', 'bs-apr-001', '2026-04-05', 'Deposit from sales', 75000, 'DEBIT', 'MATCHED', NOW()),
  ('bsi-apr-002', 'bs-apr-001', '2026-04-10', 'Salary payment', 125000, 'CREDIT', 'UNMATCHED', NOW()),
  ('bsi-apr-003', 'bs-apr-002', '2026-04-15', 'International payment', 1500, 'DEBIT', 'MATCHED', NOW());

-- ── DRAWINGS (6 total - 2 per month) ──────────────────────

INSERT INTO drawings (id, entity_id, ownership_registry_id, source_account, amount, currency, date, status, note, created_by, approved_by, approved_at, created_at) VALUES
  ('drw-feb-001', 'ent-parent-001', 'own-001', 'PROFIT', 25000, 'BDT', '2026-02-10', 'APPROVED', 'Monthly profit distribution', NULL, NULL, NOW(), NOW()),
  ('drw-feb-002', 'ent-parent-001', 'own-001', 'OWNERS_COMP', 15000, 'BDT', '2026-02-25', 'APPROVED', 'Owner compensation', NULL, NULL, NOW(), NOW()),
  ('drw-mar-001', 'ent-parent-001', 'own-001', 'PROFIT', 25000, 'BDT', '2026-03-10', 'APPROVED', 'Monthly profit distribution', NULL, NULL, NOW(), NOW()),
  ('drw-mar-002', 'ent-parent-001', 'own-001', 'OWNERS_COMP', 15000, 'BDT', '2026-03-25', 'APPROVED', 'Owner compensation', NULL, NULL, NOW(), NOW()),
  ('drw-apr-001', 'ent-parent-001', 'own-001', 'PROFIT', 25000, 'BDT', '2026-04-10', 'APPROVED', 'Monthly profit distribution', NULL, NULL, NOW(), NOW()),
  ('drw-apr-002', 'ent-parent-001', 'own-001', 'OWNERS_COMP', 15000, 'BDT', '2026-04-25', 'APPROVED', 'Owner compensation', NULL, NULL, NOW(), NOW());

-- ════════════════════════════════════════════════════════════
-- ── JOURNAL ENTRIES ──────────────────────────────────────
-- ════════════════════════════════════════════════════════════

-- ── SALARY JOURNAL ENTRIES (3 months) ────────────────────

-- February Salary Entry 1 (Hassan + Bonus)
INSERT INTO journal_entries (id, entity_id, entry_number, date, description, reference, status, created_by_role, created_at, updated_at) VALUES
  ('je-sal-feb-001', 'ent-parent-001', 1, '2026-02-15', 'Salary payment - Md. Hassan with bonus', 'sal-feb-001', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW());
INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, entity_id, entry_type, amount, currency, created_at, updated_at) VALUES
  ('jel-sal-feb-001-1', 'je-sal-feb-001', 'coa-4001', 'ent-parent-001', 'DEBIT', 52500, 'BDT', NOW(), NOW()),
  ('jel-sal-feb-001-2', 'je-sal-feb-001', 'coa-2001', 'ent-parent-001', 'CREDIT', 52500, 'BDT', NOW(), NOW());

-- February Salary Entry 2 (Hassan advance)
INSERT INTO journal_entries (id, entity_id, entry_number, date, description, reference, status, created_by_role, created_at, updated_at) VALUES
  ('je-sal-feb-002', 'ent-parent-001', 2, '2026-02-01', 'Salary advance - Md. Hassan', 'sal-feb-002', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW());
INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, entity_id, entry_type, amount, currency, created_at, updated_at) VALUES
  ('jel-sal-feb-002-1', 'je-sal-feb-002', 'coa-4001', 'ent-parent-001', 'DEBIT', 25000, 'BDT', NOW(), NOW()),
  ('jel-sal-feb-002-2', 'je-sal-feb-002', 'coa-2001', 'ent-parent-001', 'CREDIT', 25000, 'BDT', NOW(), NOW());

-- February Salary Entry 3 (Ayesha + Bonus)
INSERT INTO journal_entries (id, entity_id, entry_number, date, description, reference, status, created_by_role, created_at, updated_at) VALUES
  ('je-sal-feb-003', 'ent-parent-001', 3, '2026-02-15', 'Salary payment - Ayesha Khan with bonus', 'sal-feb-003', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW());
INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, entity_id, entry_type, amount, currency, created_at, updated_at) VALUES
  ('jel-sal-feb-003-1', 'je-sal-feb-003', 'coa-4001', 'ent-parent-001', 'DEBIT', 36750, 'BDT', NOW(), NOW()),
  ('jel-sal-feb-003-2', 'je-sal-feb-003', 'coa-2001', 'ent-parent-001', 'CREDIT', 36750, 'BDT', NOW(), NOW());

-- February Salary Entry 4 (Ayesha advance)
INSERT INTO journal_entries (id, entity_id, entry_number, date, description, reference, status, created_by_role, created_at, updated_at) VALUES
  ('je-sal-feb-004', 'ent-parent-001', 4, '2026-02-01', 'Salary advance - Ayesha Khan', 'sal-feb-004', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW());
INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, entity_id, entry_type, amount, currency, created_at, updated_at) VALUES
  ('jel-sal-feb-004-1', 'je-sal-feb-004', 'coa-4001', 'ent-parent-001', 'DEBIT', 17500, 'BDT', NOW(), NOW()),
  ('jel-sal-feb-004-2', 'je-sal-feb-004', 'coa-2001', 'ent-parent-001', 'CREDIT', 17500, 'BDT', NOW(), NOW());

-- February Salary Entry 5 (Rahman + Bonus)
INSERT INTO journal_entries (id, entity_id, entry_number, date, description, reference, status, created_by_role, created_at, updated_at) VALUES
  ('je-sal-feb-005', 'ent-parent-001', 5, '2026-02-15', 'Salary payment - Rahman Ahmed with bonus', 'sal-feb-005', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW());
INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, entity_id, entry_type, amount, currency, created_at, updated_at) VALUES
  ('jel-sal-feb-005-1', 'je-sal-feb-005', 'coa-4001', 'ent-parent-001', 'DEBIT', 42000, 'BDT', NOW(), NOW()),
  ('jel-sal-feb-005-2', 'je-sal-feb-005', 'coa-2001', 'ent-parent-001', 'CREDIT', 42000, 'BDT', NOW(), NOW());

-- February Salary Entry 6 (Rahman advance)
INSERT INTO journal_entries (id, entity_id, entry_number, date, description, reference, status, created_by_role, created_at, updated_at) VALUES
  ('je-sal-feb-006', 'ent-parent-001', 6, '2026-02-01', 'Salary advance - Rahman Ahmed', 'sal-feb-006', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW());
INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, entity_id, entry_type, amount, currency, created_at, updated_at) VALUES
  ('jel-sal-feb-006-1', 'je-sal-feb-006', 'coa-4001', 'ent-parent-001', 'DEBIT', 20000, 'BDT', NOW(), NOW()),
  ('jel-sal-feb-006-2', 'je-sal-feb-006', 'coa-2001', 'ent-parent-001', 'CREDIT', 20000, 'BDT', NOW(), NOW());

-- March Salary Entries
INSERT INTO journal_entries (id, entity_id, entry_number, date, description, reference, status, created_by_role, created_at, updated_at) VALUES
  ('je-sal-mar-001', 'ent-parent-001', 7, '2026-03-15', 'Salary payment - Md. Hassan with bonus', 'sal-mar-001', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-sal-mar-002', 'ent-parent-001', 8, '2026-03-01', 'Salary advance - Md. Hassan', 'sal-mar-002', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-sal-mar-003', 'ent-parent-001', 9, '2026-03-15', 'Salary payment - Ayesha Khan with bonus', 'sal-mar-003', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-sal-mar-004', 'ent-parent-001', 10, '2026-03-01', 'Salary advance - Ayesha Khan', 'sal-mar-004', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-sal-mar-005', 'ent-parent-001', 11, '2026-03-15', 'Salary payment - Rahman Ahmed with bonus', 'sal-mar-005', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-sal-mar-006', 'ent-parent-001', 12, '2026-03-01', 'Salary advance - Rahman Ahmed', 'sal-mar-006', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW());

INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, entity_id, entry_type, amount, currency, created_at, updated_at) VALUES
  ('jel-sal-mar-001-1', 'je-sal-mar-001', 'coa-4001', 'ent-parent-001', 'DEBIT', 52500, 'BDT', NOW(), NOW()),
  ('jel-sal-mar-001-2', 'je-sal-mar-001', 'coa-2001', 'ent-parent-001', 'CREDIT', 52500, 'BDT', NOW(), NOW()),
  ('jel-sal-mar-002-1', 'je-sal-mar-002', 'coa-4001', 'ent-parent-001', 'DEBIT', 25000, 'BDT', NOW(), NOW()),
  ('jel-sal-mar-002-2', 'je-sal-mar-002', 'coa-2001', 'ent-parent-001', 'CREDIT', 25000, 'BDT', NOW(), NOW()),
  ('jel-sal-mar-003-1', 'je-sal-mar-003', 'coa-4001', 'ent-parent-001', 'DEBIT', 36750, 'BDT', NOW(), NOW()),
  ('jel-sal-mar-003-2', 'je-sal-mar-003', 'coa-2001', 'ent-parent-001', 'CREDIT', 36750, 'BDT', NOW(), NOW()),
  ('jel-sal-mar-004-1', 'je-sal-mar-004', 'coa-4001', 'ent-parent-001', 'DEBIT', 17500, 'BDT', NOW(), NOW()),
  ('jel-sal-mar-004-2', 'je-sal-mar-004', 'coa-2001', 'ent-parent-001', 'CREDIT', 17500, 'BDT', NOW(), NOW()),
  ('jel-sal-mar-005-1', 'je-sal-mar-005', 'coa-4001', 'ent-parent-001', 'DEBIT', 42000, 'BDT', NOW(), NOW()),
  ('jel-sal-mar-005-2', 'je-sal-mar-005', 'coa-2001', 'ent-parent-001', 'CREDIT', 42000, 'BDT', NOW(), NOW()),
  ('jel-sal-mar-006-1', 'je-sal-mar-006', 'coa-4001', 'ent-parent-001', 'DEBIT', 20000, 'BDT', NOW(), NOW()),
  ('jel-sal-mar-006-2', 'je-sal-mar-006', 'coa-2001', 'ent-parent-001', 'CREDIT', 20000, 'BDT', NOW(), NOW());

-- April Salary Entries
INSERT INTO journal_entries (id, entity_id, entry_number, date, description, reference, status, created_by_role, created_at, updated_at) VALUES
  ('je-sal-apr-001', 'ent-parent-001', 13, '2026-04-15', 'Salary payment - Md. Hassan with bonus', 'sal-apr-001', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-sal-apr-002', 'ent-parent-001', 14, '2026-04-01', 'Salary advance - Md. Hassan', 'sal-apr-002', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-sal-apr-003', 'ent-parent-001', 15, '2026-04-15', 'Salary payment - Ayesha Khan with bonus', 'sal-apr-003', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-sal-apr-004', 'ent-parent-001', 16, '2026-04-01', 'Salary advance - Ayesha Khan', 'sal-apr-004', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-sal-apr-005', 'ent-parent-001', 17, '2026-04-15', 'Salary payment - Rahman Ahmed with bonus', 'sal-apr-005', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-sal-apr-006', 'ent-parent-001', 18, '2026-04-01', 'Salary advance - Rahman Ahmed', 'sal-apr-006', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW());

INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, entity_id, entry_type, amount, currency, created_at, updated_at) VALUES
  ('jel-sal-apr-001-1', 'je-sal-apr-001', 'coa-4001', 'ent-parent-001', 'DEBIT', 52500, 'BDT', NOW(), NOW()),
  ('jel-sal-apr-001-2', 'je-sal-apr-001', 'coa-2001', 'ent-parent-001', 'CREDIT', 52500, 'BDT', NOW(), NOW()),
  ('jel-sal-apr-002-1', 'je-sal-apr-002', 'coa-4001', 'ent-parent-001', 'DEBIT', 25000, 'BDT', NOW(), NOW()),
  ('jel-sal-apr-002-2', 'je-sal-apr-002', 'coa-2001', 'ent-parent-001', 'CREDIT', 25000, 'BDT', NOW(), NOW()),
  ('jel-sal-apr-003-1', 'je-sal-apr-003', 'coa-4001', 'ent-parent-001', 'DEBIT', 36750, 'BDT', NOW(), NOW()),
  ('jel-sal-apr-003-2', 'je-sal-apr-003', 'coa-2001', 'ent-parent-001', 'CREDIT', 36750, 'BDT', NOW(), NOW()),
  ('jel-sal-apr-004-1', 'je-sal-apr-004', 'coa-4001', 'ent-parent-001', 'DEBIT', 17500, 'BDT', NOW(), NOW()),
  ('jel-sal-apr-004-2', 'je-sal-apr-004', 'coa-2001', 'ent-parent-001', 'CREDIT', 17500, 'BDT', NOW(), NOW()),
  ('jel-sal-apr-005-1', 'je-sal-apr-005', 'coa-4001', 'ent-parent-001', 'DEBIT', 42000, 'BDT', NOW(), NOW()),
  ('jel-sal-apr-005-2', 'je-sal-apr-005', 'coa-2001', 'ent-parent-001', 'CREDIT', 42000, 'BDT', NOW(), NOW()),
  ('jel-sal-apr-006-1', 'je-sal-apr-006', 'coa-4001', 'ent-parent-001', 'DEBIT', 20000, 'BDT', NOW(), NOW()),
  ('jel-sal-apr-006-2', 'je-sal-apr-006', 'coa-2001', 'ent-parent-001', 'CREDIT', 20000, 'BDT', NOW(), NOW());

-- ── PETTY CASH EXPENSE JOURNAL ENTRIES (3 months × 12 entries) ──

-- February Petty Cash Entries (36 total lines for 12 expense entries)
INSERT INTO journal_entries (id, entity_id, entry_number, date, description, reference, status, created_by_role, created_at, updated_at) VALUES
  ('je-pce-feb-01', 'ent-subbrand-001', 19, '2026-02-01', 'Office supplies', 'pce-feb-01', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-pce-feb-02', 'ent-subbrand-001', 20, '2026-02-03', 'Printer cartridges', 'pce-feb-02', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-pce-feb-03', 'ent-subbrand-001', 21, '2026-02-05', 'Team lunch', 'pce-feb-03', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-pce-feb-04', 'ent-subbrand-001', 22, '2026-02-07', 'Office snacks', 'pce-feb-04', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-pce-feb-05', 'ent-subbrand-001', 23, '2026-02-09', 'Courier charges', 'pce-feb-05', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-pce-feb-06', 'ent-subbrand-001', 24, '2026-02-11', 'Local delivery', 'pce-feb-06', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-pce-feb-07', 'ent-subbrand-001', 25, '2026-02-13', 'Internet bill', 'pce-feb-07', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-pce-feb-08', 'ent-subbrand-001', 26, '2026-02-15', 'Electricity top-up', 'pce-feb-08', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-pce-feb-09', 'ent-subbrand-001', 27, '2026-02-17', 'Taxi/transport', 'pce-feb-09', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-pce-feb-10', 'ent-subbrand-001', 28, '2026-02-19', 'Parking and fuel', 'pce-feb-10', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-pce-feb-11', 'ent-subbrand-001', 29, '2026-02-21', 'Office rent advance', 'pce-feb-11', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-pce-feb-12', 'ent-subbrand-001', 30, '2026-02-23', 'Maintenance supplies', 'pce-feb-12', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW());

INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, entity_id, entry_type, amount, currency, created_at, updated_at) VALUES
  ('jel-pce-feb-01-1', 'je-pce-feb-01', 'coa-5006', 'ent-subbrand-001', 'DEBIT', 1250, 'BDT', NOW(), NOW()),
  ('jel-pce-feb-01-2', 'je-pce-feb-01', 'coa-5002', 'ent-subbrand-001', 'CREDIT', 1250, 'BDT', NOW(), NOW()),
  ('jel-pce-feb-02-1', 'je-pce-feb-02', 'coa-5006', 'ent-subbrand-001', 'DEBIT', 2450, 'BDT', NOW(), NOW()),
  ('jel-pce-feb-02-2', 'je-pce-feb-02', 'coa-5002', 'ent-subbrand-001', 'CREDIT', 2450, 'BDT', NOW(), NOW()),
  ('jel-pce-feb-03-1', 'je-pce-feb-03', 'coa-5010', 'ent-subbrand-001', 'DEBIT', 3200, 'BDT', NOW(), NOW()),
  ('jel-pce-feb-03-2', 'je-pce-feb-03', 'coa-5002', 'ent-subbrand-001', 'CREDIT', 3200, 'BDT', NOW(), NOW()),
  ('jel-pce-feb-04-1', 'je-pce-feb-04', 'coa-5010', 'ent-subbrand-001', 'DEBIT', 1800, 'BDT', NOW(), NOW()),
  ('jel-pce-feb-04-2', 'je-pce-feb-04', 'coa-5002', 'ent-subbrand-001', 'CREDIT', 1800, 'BDT', NOW(), NOW()),
  ('jel-pce-feb-05-1', 'je-pce-feb-05', 'coa-5011', 'ent-subbrand-001', 'DEBIT', 850, 'BDT', NOW(), NOW()),
  ('jel-pce-feb-05-2', 'je-pce-feb-05', 'coa-5002', 'ent-subbrand-001', 'CREDIT', 850, 'BDT', NOW(), NOW()),
  ('jel-pce-feb-06-1', 'je-pce-feb-06', 'coa-5011', 'ent-subbrand-001', 'DEBIT', 600, 'BDT', NOW(), NOW()),
  ('jel-pce-feb-06-2', 'je-pce-feb-06', 'coa-5002', 'ent-subbrand-001', 'CREDIT', 600, 'BDT', NOW(), NOW()),
  ('jel-pce-feb-07-1', 'je-pce-feb-07', 'coa-5012', 'ent-subbrand-001', 'DEBIT', 1500, 'BDT', NOW(), NOW()),
  ('jel-pce-feb-07-2', 'je-pce-feb-07', 'coa-5002', 'ent-subbrand-001', 'CREDIT', 1500, 'BDT', NOW(), NOW()),
  ('jel-pce-feb-08-1', 'je-pce-feb-08', 'coa-5008', 'ent-subbrand-001', 'DEBIT', 2000, 'BDT', NOW(), NOW()),
  ('jel-pce-feb-08-2', 'je-pce-feb-08', 'coa-5002', 'ent-subbrand-001', 'CREDIT', 2000, 'BDT', NOW(), NOW()),
  ('jel-pce-feb-09-1', 'je-pce-feb-09', 'coa-5009', 'ent-subbrand-001', 'DEBIT', 950, 'BDT', NOW(), NOW()),
  ('jel-pce-feb-09-2', 'je-pce-feb-09', 'coa-5002', 'ent-subbrand-001', 'CREDIT', 950, 'BDT', NOW(), NOW()),
  ('jel-pce-feb-10-1', 'je-pce-feb-10', 'coa-5009', 'ent-subbrand-001', 'DEBIT', 1300, 'BDT', NOW(), NOW()),
  ('jel-pce-feb-10-2', 'je-pce-feb-10', 'coa-5002', 'ent-subbrand-001', 'CREDIT', 1300, 'BDT', NOW(), NOW()),
  ('jel-pce-feb-11-1', 'je-pce-feb-11', 'coa-5007', 'ent-subbrand-001', 'DEBIT', 5000, 'BDT', NOW(), NOW()),
  ('jel-pce-feb-11-2', 'je-pce-feb-11', 'coa-5002', 'ent-subbrand-001', 'CREDIT', 5000, 'BDT', NOW(), NOW()),
  ('jel-pce-feb-12-1', 'je-pce-feb-12', 'coa-5013', 'ent-subbrand-001', 'DEBIT', 2200, 'BDT', NOW(), NOW()),
  ('jel-pce-feb-12-2', 'je-pce-feb-12', 'coa-5002', 'ent-subbrand-001', 'CREDIT', 2200, 'BDT', NOW(), NOW());

-- March Petty Cash Entries
INSERT INTO journal_entries (id, entity_id, entry_number, date, description, reference, status, created_by_role, created_at, updated_at) VALUES
  ('je-pce-mar-01', 'ent-subbrand-001', 31, '2026-03-01', 'Office supplies', 'pce-mar-01', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-pce-mar-02', 'ent-subbrand-001', 32, '2026-03-03', 'Printer cartridges', 'pce-mar-02', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-pce-mar-03', 'ent-subbrand-001', 33, '2026-03-05', 'Team lunch', 'pce-mar-03', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-pce-mar-04', 'ent-subbrand-001', 34, '2026-03-07', 'Office snacks', 'pce-mar-04', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-pce-mar-05', 'ent-subbrand-001', 35, '2026-03-09', 'Courier charges', 'pce-mar-05', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-pce-mar-06', 'ent-subbrand-001', 36, '2026-03-11', 'Local delivery', 'pce-mar-06', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-pce-mar-07', 'ent-subbrand-001', 37, '2026-03-13', 'Internet bill', 'pce-mar-07', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-pce-mar-08', 'ent-subbrand-001', 38, '2026-03-15', 'Electricity top-up', 'pce-mar-08', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-pce-mar-09', 'ent-subbrand-001', 39, '2026-03-17', 'Taxi/transport', 'pce-mar-09', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-pce-mar-10', 'ent-subbrand-001', 40, '2026-03-19', 'Parking and fuel', 'pce-mar-10', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-pce-mar-11', 'ent-subbrand-001', 41, '2026-03-21', 'Office rent advance', 'pce-mar-11', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-pce-mar-12', 'ent-subbrand-001', 42, '2026-03-23', 'Maintenance supplies', 'pce-mar-12', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW());

INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, entity_id, entry_type, amount, currency, created_at, updated_at) VALUES
  ('jel-pce-mar-01-1', 'je-pce-mar-01', 'coa-5006', 'ent-subbrand-001', 'DEBIT', 1250, 'BDT', NOW(), NOW()),
  ('jel-pce-mar-01-2', 'je-pce-mar-01', 'coa-5002', 'ent-subbrand-001', 'CREDIT', 1250, 'BDT', NOW(), NOW()),
  ('jel-pce-mar-02-1', 'je-pce-mar-02', 'coa-5006', 'ent-subbrand-001', 'DEBIT', 2450, 'BDT', NOW(), NOW()),
  ('jel-pce-mar-02-2', 'je-pce-mar-02', 'coa-5002', 'ent-subbrand-001', 'CREDIT', 2450, 'BDT', NOW(), NOW()),
  ('jel-pce-mar-03-1', 'je-pce-mar-03', 'coa-5010', 'ent-subbrand-001', 'DEBIT', 3200, 'BDT', NOW(), NOW()),
  ('jel-pce-mar-03-2', 'je-pce-mar-03', 'coa-5002', 'ent-subbrand-001', 'CREDIT', 3200, 'BDT', NOW(), NOW()),
  ('jel-pce-mar-04-1', 'je-pce-mar-04', 'coa-5010', 'ent-subbrand-001', 'DEBIT', 1800, 'BDT', NOW(), NOW()),
  ('jel-pce-mar-04-2', 'je-pce-mar-04', 'coa-5002', 'ent-subbrand-001', 'CREDIT', 1800, 'BDT', NOW(), NOW()),
  ('jel-pce-mar-05-1', 'je-pce-mar-05', 'coa-5011', 'ent-subbrand-001', 'DEBIT', 850, 'BDT', NOW(), NOW()),
  ('jel-pce-mar-05-2', 'je-pce-mar-05', 'coa-5002', 'ent-subbrand-001', 'CREDIT', 850, 'BDT', NOW(), NOW()),
  ('jel-pce-mar-06-1', 'je-pce-mar-06', 'coa-5011', 'ent-subbrand-001', 'DEBIT', 600, 'BDT', NOW(), NOW()),
  ('jel-pce-mar-06-2', 'je-pce-mar-06', 'coa-5002', 'ent-subbrand-001', 'CREDIT', 600, 'BDT', NOW(), NOW()),
  ('jel-pce-mar-07-1', 'je-pce-mar-07', 'coa-5012', 'ent-subbrand-001', 'DEBIT', 1500, 'BDT', NOW(), NOW()),
  ('jel-pce-mar-07-2', 'je-pce-mar-07', 'coa-5002', 'ent-subbrand-001', 'CREDIT', 1500, 'BDT', NOW(), NOW()),
  ('jel-pce-mar-08-1', 'je-pce-mar-08', 'coa-5008', 'ent-subbrand-001', 'DEBIT', 2000, 'BDT', NOW(), NOW()),
  ('jel-pce-mar-08-2', 'je-pce-mar-08', 'coa-5002', 'ent-subbrand-001', 'CREDIT', 2000, 'BDT', NOW(), NOW()),
  ('jel-pce-mar-09-1', 'je-pce-mar-09', 'coa-5009', 'ent-subbrand-001', 'DEBIT', 950, 'BDT', NOW(), NOW()),
  ('jel-pce-mar-09-2', 'je-pce-mar-09', 'coa-5002', 'ent-subbrand-001', 'CREDIT', 950, 'BDT', NOW(), NOW()),
  ('jel-pce-mar-10-1', 'je-pce-mar-10', 'coa-5009', 'ent-subbrand-001', 'DEBIT', 1300, 'BDT', NOW(), NOW()),
  ('jel-pce-mar-10-2', 'je-pce-mar-10', 'coa-5002', 'ent-subbrand-001', 'CREDIT', 1300, 'BDT', NOW(), NOW()),
  ('jel-pce-mar-11-1', 'je-pce-mar-11', 'coa-5007', 'ent-subbrand-001', 'DEBIT', 5000, 'BDT', NOW(), NOW()),
  ('jel-pce-mar-11-2', 'je-pce-mar-11', 'coa-5002', 'ent-subbrand-001', 'CREDIT', 5000, 'BDT', NOW(), NOW()),
  ('jel-pce-mar-12-1', 'je-pce-mar-12', 'coa-5013', 'ent-subbrand-001', 'DEBIT', 2200, 'BDT', NOW(), NOW()),
  ('jel-pce-mar-12-2', 'je-pce-mar-12', 'coa-5002', 'ent-subbrand-001', 'CREDIT', 2200, 'BDT', NOW(), NOW());

-- April Petty Cash Entries
INSERT INTO journal_entries (id, entity_id, entry_number, date, description, reference, status, created_by_role, created_at, updated_at) VALUES
  ('je-pce-apr-01', 'ent-subbrand-001', 43, '2026-04-01', 'Office supplies', 'pce-apr-01', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-pce-apr-02', 'ent-subbrand-001', 44, '2026-04-03', 'Printer cartridges', 'pce-apr-02', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-pce-apr-03', 'ent-subbrand-001', 45, '2026-04-05', 'Team lunch', 'pce-apr-03', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-pce-apr-04', 'ent-subbrand-001', 46, '2026-04-07', 'Office snacks', 'pce-apr-04', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-pce-apr-05', 'ent-subbrand-001', 47, '2026-04-09', 'Courier charges', 'pce-apr-05', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-pce-apr-06', 'ent-subbrand-001', 48, '2026-04-11', 'Local delivery', 'pce-apr-06', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-pce-apr-07', 'ent-subbrand-001', 49, '2026-04-13', 'Internet bill', 'pce-apr-07', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-pce-apr-08', 'ent-subbrand-001', 50, '2026-04-15', 'Electricity top-up', 'pce-apr-08', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-pce-apr-09', 'ent-subbrand-001', 51, '2026-04-17', 'Taxi/transport', 'pce-apr-09', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-pce-apr-10', 'ent-subbrand-001', 52, '2026-04-19', 'Parking and fuel', 'pce-apr-10', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-pce-apr-11', 'ent-subbrand-001', 53, '2026-04-21', 'Office rent advance', 'pce-apr-11', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-pce-apr-12', 'ent-subbrand-001', 54, '2026-04-23', 'Maintenance supplies', 'pce-apr-12', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW());

INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, entity_id, entry_type, amount, currency, created_at, updated_at) VALUES
  ('jel-pce-apr-01-1', 'je-pce-apr-01', 'coa-5006', 'ent-subbrand-001', 'DEBIT', 1250, 'BDT', NOW(), NOW()),
  ('jel-pce-apr-01-2', 'je-pce-apr-01', 'coa-5002', 'ent-subbrand-001', 'CREDIT', 1250, 'BDT', NOW(), NOW()),
  ('jel-pce-apr-02-1', 'je-pce-apr-02', 'coa-5006', 'ent-subbrand-001', 'DEBIT', 2450, 'BDT', NOW(), NOW()),
  ('jel-pce-apr-02-2', 'je-pce-apr-02', 'coa-5002', 'ent-subbrand-001', 'CREDIT', 2450, 'BDT', NOW(), NOW()),
  ('jel-pce-apr-03-1', 'je-pce-apr-03', 'coa-5010', 'ent-subbrand-001', 'DEBIT', 3200, 'BDT', NOW(), NOW()),
  ('jel-pce-apr-03-2', 'je-pce-apr-03', 'coa-5002', 'ent-subbrand-001', 'CREDIT', 3200, 'BDT', NOW(), NOW()),
  ('jel-pce-apr-04-1', 'je-pce-apr-04', 'coa-5010', 'ent-subbrand-001', 'DEBIT', 1800, 'BDT', NOW(), NOW()),
  ('jel-pce-apr-04-2', 'je-pce-apr-04', 'coa-5002', 'ent-subbrand-001', 'CREDIT', 1800, 'BDT', NOW(), NOW()),
  ('jel-pce-apr-05-1', 'je-pce-apr-05', 'coa-5011', 'ent-subbrand-001', 'DEBIT', 850, 'BDT', NOW(), NOW()),
  ('jel-pce-apr-05-2', 'je-pce-apr-05', 'coa-5002', 'ent-subbrand-001', 'CREDIT', 850, 'BDT', NOW(), NOW()),
  ('jel-pce-apr-06-1', 'je-pce-apr-06', 'coa-5011', 'ent-subbrand-001', 'DEBIT', 600, 'BDT', NOW(), NOW()),
  ('jel-pce-apr-06-2', 'je-pce-apr-06', 'coa-5002', 'ent-subbrand-001', 'CREDIT', 600, 'BDT', NOW(), NOW()),
  ('jel-pce-apr-07-1', 'je-pce-apr-07', 'coa-5012', 'ent-subbrand-001', 'DEBIT', 1500, 'BDT', NOW(), NOW()),
  ('jel-pce-apr-07-2', 'je-pce-apr-07', 'coa-5002', 'ent-subbrand-001', 'CREDIT', 1500, 'BDT', NOW(), NOW()),
  ('jel-pce-apr-08-1', 'je-pce-apr-08', 'coa-5008', 'ent-subbrand-001', 'DEBIT', 2000, 'BDT', NOW(), NOW()),
  ('jel-pce-apr-08-2', 'je-pce-apr-08', 'coa-5002', 'ent-subbrand-001', 'CREDIT', 2000, 'BDT', NOW(), NOW()),
  ('jel-pce-apr-09-1', 'je-pce-apr-09', 'coa-5009', 'ent-subbrand-001', 'DEBIT', 950, 'BDT', NOW(), NOW()),
  ('jel-pce-apr-09-2', 'je-pce-apr-09', 'coa-5002', 'ent-subbrand-001', 'CREDIT', 950, 'BDT', NOW(), NOW()),
  ('jel-pce-apr-10-1', 'je-pce-apr-10', 'coa-5009', 'ent-subbrand-001', 'DEBIT', 1300, 'BDT', NOW(), NOW()),
  ('jel-pce-apr-10-2', 'je-pce-apr-10', 'coa-5002', 'ent-subbrand-001', 'CREDIT', 1300, 'BDT', NOW(), NOW()),
  ('jel-pce-apr-11-1', 'je-pce-apr-11', 'coa-5007', 'ent-subbrand-001', 'DEBIT', 5000, 'BDT', NOW(), NOW()),
  ('jel-pce-apr-11-2', 'je-pce-apr-11', 'coa-5002', 'ent-subbrand-001', 'CREDIT', 5000, 'BDT', NOW(), NOW()),
  ('jel-pce-apr-12-1', 'je-pce-apr-12', 'coa-5013', 'ent-subbrand-001', 'DEBIT', 2200, 'BDT', NOW(), NOW()),
  ('jel-pce-apr-12-2', 'je-pce-apr-12', 'coa-5002', 'ent-subbrand-001', 'CREDIT', 2200, 'BDT', NOW(), NOW());

-- ── OWNER DRAWING JOURNAL ENTRIES ────────────────────────

INSERT INTO journal_entries (id, entity_id, entry_number, date, description, reference, status, created_by_role, created_at, updated_at) VALUES
  ('je-drw-feb-001', 'ent-parent-001', 55, '2026-02-10', 'Owner drawing - profit distribution', 'drw-feb-001', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-drw-feb-002', 'ent-parent-001', 56, '2026-02-25', 'Owner drawing - owner compensation', 'drw-feb-002', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-drw-mar-001', 'ent-parent-001', 57, '2026-03-10', 'Owner drawing - profit distribution', 'drw-mar-001', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-drw-mar-002', 'ent-parent-001', 58, '2026-03-25', 'Owner drawing - owner compensation', 'drw-mar-002', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-drw-apr-001', 'ent-parent-001', 59, '2026-04-10', 'Owner drawing - profit distribution', 'drw-apr-001', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW()),
  ('je-drw-apr-002', 'ent-parent-001', 60, '2026-04-25', 'Owner drawing - owner compensation', 'drw-apr-002', 'FINALIZED', 'ENTRY_MANAGER', NOW(), NOW());

INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, entity_id, entry_type, amount, currency, created_at, updated_at) VALUES
  ('jel-drw-feb-001-1', 'je-drw-feb-001', 'coa-3002', 'ent-parent-001', 'DEBIT', 25000, 'BDT', NOW(), NOW()),
  ('jel-drw-feb-001-2', 'je-drw-feb-001', 'coa-1001', 'ent-parent-001', 'CREDIT', 25000, 'BDT', NOW(), NOW()),
  ('jel-drw-feb-002-1', 'je-drw-feb-002', 'coa-3002', 'ent-parent-001', 'DEBIT', 15000, 'BDT', NOW(), NOW()),
  ('jel-drw-feb-002-2', 'je-drw-feb-002', 'coa-1001', 'ent-parent-001', 'CREDIT', 15000, 'BDT', NOW(), NOW()),
  ('jel-drw-mar-001-1', 'je-drw-mar-001', 'coa-3002', 'ent-parent-001', 'DEBIT', 25000, 'BDT', NOW(), NOW()),
  ('jel-drw-mar-001-2', 'je-drw-mar-001', 'coa-1001', 'ent-parent-001', 'CREDIT', 25000, 'BDT', NOW(), NOW()),
  ('jel-drw-mar-002-1', 'je-drw-mar-002', 'coa-3002', 'ent-parent-001', 'DEBIT', 15000, 'BDT', NOW(), NOW()),
  ('jel-drw-mar-002-2', 'je-drw-mar-002', 'coa-1001', 'ent-parent-001', 'CREDIT', 15000, 'BDT', NOW(), NOW()),
  ('jel-drw-apr-001-1', 'je-drw-apr-001', 'coa-3002', 'ent-parent-001', 'DEBIT', 25000, 'BDT', NOW(), NOW()),
  ('jel-drw-apr-001-2', 'je-drw-apr-001', 'coa-1001', 'ent-parent-001', 'CREDIT', 25000, 'BDT', NOW(), NOW()),
  ('jel-drw-apr-002-1', 'je-drw-apr-002', 'coa-3002', 'ent-parent-001', 'DEBIT', 15000, 'BDT', NOW(), NOW()),
  ('jel-drw-apr-002-2', 'je-drw-apr-002', 'coa-1001', 'ent-parent-001', 'CREDIT', 15000, 'BDT', NOW(), NOW());

-- ────────────────────────────────────────────────────────────
-- SUMMARY
-- ────────────────────────────────────────────────────────────
-- Total Data Points:
-- - 2 Entities
-- - 2 Ownership Records
-- - 3 Bank Accounts
-- - 13 Chart of Accounts (ABC Trading)
-- - 13 Chart of Accounts (XYZ Services)
-- - 3 Employees
-- - 18 Salary Records
-- - 2 Salary Increments
-- - 3 Petty Cash Periods
-- - 36 Petty Cash Entries (12 per month)
-- - 6 Fund Transfers
-- - 6 Bank Statements
-- - 9 Bank Statement Items
-- - 6 Owner Drawings
-- - 18 Salary Journal Entries with 36 journal lines
-- - 36 Petty Cash Journal Entries with 72 journal lines
-- - 6 Owner Drawing Journal Entries with 12 journal lines
--
-- TOTAL: 200+ data records with 60+ journal entries across 3 months (Feb-Apr 2026)
-- ────────────────────────────────────────────────────────────
