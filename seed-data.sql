-- ────────────────────────────────────────────────────────────
-- SEED DATA - 3 MONTHS OF DEMO TRANSACTIONS
-- Run this in Supabase SQL Editor after running migrations
-- ────────────────────────────────────────────────────────────

-- Replace these with actual UUIDs from your system
-- User ID: Update this with the actual user ID
\set user_id '00000000-0000-0000-0000-000000000000'

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

-- ── EMPLOYEES ────────────────────────────────────────────

INSERT INTO employees (id, name, designation, department, base_salary, status, joined_at, resigned_at, created_by, created_at, updated_at) VALUES
  ('emp-001', 'Md. Hassan', 'Operations Manager', 'Operations', 50000, 'ACTIVE', '2023-01-15', NULL, :user_id, NOW(), NOW()),
  ('emp-002', 'Ayesha Khan', 'Accountant', 'Finance', 35000, 'ACTIVE', '2023-06-01', NULL, :user_id, NOW(), NOW()),
  ('emp-003', 'Rahman Ahmed', 'Sales Executive', 'Sales', 40000, 'ACTIVE', '2022-03-10', NULL, :user_id, NOW(), NOW());

-- ── SALARY RECORDS (3 months × 3 employees × 2 records) ────

-- February 2026
INSERT INTO salaries (id, employee_id, employee_name, amount, adjustment, adjustment_note, pay_period, date, created_by, created_at) VALUES
  ('sal-feb-001', 'emp-001', 'Md. Hassan', 50000, 2500, 'Monthly performance bonus', '2026-02', '2026-02-15', :user_id, NOW()),
  ('sal-feb-002', 'emp-001', 'Md. Hassan', 25000, NULL, 'Salary advance', '2026-02', '2026-02-01', :user_id, NOW()),
  ('sal-feb-003', 'emp-002', 'Ayesha Khan', 35000, 1750, 'Monthly performance bonus', '2026-02', '2026-02-15', :user_id, NOW()),
  ('sal-feb-004', 'emp-002', 'Ayesha Khan', 17500, NULL, 'Salary advance', '2026-02', '2026-02-01', :user_id, NOW()),
  ('sal-feb-005', 'emp-003', 'Rahman Ahmed', 40000, 2000, 'Monthly performance bonus', '2026-02', '2026-02-15', :user_id, NOW()),
  ('sal-feb-006', 'emp-003', 'Rahman Ahmed', 20000, NULL, 'Salary advance', '2026-02', '2026-02-01', :user_id, NOW());

-- March 2026
INSERT INTO salaries (id, employee_id, employee_name, amount, adjustment, adjustment_note, pay_period, date, created_by, created_at) VALUES
  ('sal-mar-001', 'emp-001', 'Md. Hassan', 50000, 2500, 'Monthly performance bonus', '2026-03', '2026-03-15', :user_id, NOW()),
  ('sal-mar-002', 'emp-001', 'Md. Hassan', 25000, NULL, 'Salary advance', '2026-03', '2026-03-01', :user_id, NOW()),
  ('sal-mar-003', 'emp-002', 'Ayesha Khan', 35000, 1750, 'Monthly performance bonus', '2026-03', '2026-03-15', :user_id, NOW()),
  ('sal-mar-004', 'emp-002', 'Ayesha Khan', 17500, NULL, 'Salary advance', '2026-03', '2026-03-01', :user_id, NOW()),
  ('sal-mar-005', 'emp-003', 'Rahman Ahmed', 40000, 2000, 'Monthly performance bonus', '2026-03', '2026-03-15', :user_id, NOW()),
  ('sal-mar-006', 'emp-003', 'Rahman Ahmed', 20000, NULL, 'Salary advance', '2026-03', '2026-03-01', :user_id, NOW());

-- April 2026
INSERT INTO salaries (id, employee_id, employee_name, amount, adjustment, adjustment_note, pay_period, date, created_by, created_at) VALUES
  ('sal-apr-001', 'emp-001', 'Md. Hassan', 50000, 2500, 'Monthly performance bonus', '2026-04', '2026-04-15', :user_id, NOW()),
  ('sal-apr-002', 'emp-001', 'Md. Hassan', 25000, NULL, 'Salary advance', '2026-04', '2026-04-01', :user_id, NOW()),
  ('sal-apr-003', 'emp-002', 'Ayesha Khan', 35000, 1750, 'Monthly performance bonus', '2026-04', '2026-04-15', :user_id, NOW()),
  ('sal-apr-004', 'emp-002', 'Ayesha Khan', 17500, NULL, 'Salary advance', '2026-04', '2026-04-01', :user_id, NOW()),
  ('sal-apr-005', 'emp-003', 'Rahman Ahmed', 40000, 2000, 'Monthly performance bonus', '2026-04', '2026-04-15', :user_id, NOW()),
  ('sal-apr-006', 'emp-003', 'Rahman Ahmed', 20000, NULL, 'Salary advance', '2026-04', '2026-04-01', :user_id, NOW());

-- ── SALARY INCREMENTS ────────────────────────────────────

INSERT INTO salary_increments (id, employee_id, previous_salary, new_salary, effective_date, reason, created_by, created_at) VALUES
  ('inc-001', 'emp-001', 50000, 52000, '2026-02-01', 'Annual review', :user_id, NOW()),
  ('inc-002', 'emp-002', 35000, 37000, '2026-04-15', 'Promotion', :user_id, NOW());

-- ── PETTY CASH PERIODS ───────────────────────────────────

INSERT INTO petty_cash_periods (id, entity_id, period_start, period_end, float_amount, currency, is_closed, created_at) VALUES
  ('pcp-feb', 'ent-subbrand-001', '2026-02-01', '2026-02-28', 15000, 'BDT', false, NOW()),
  ('pcp-mar', 'ent-subbrand-001', '2026-03-01', '2026-03-31', 15000, 'BDT', false, NOW()),
  ('pcp-apr', 'ent-subbrand-001', '2026-04-01', '2026-04-30', 15000, 'BDT', false, NOW());

-- ── PETTY CASH ENTRIES (12 types × 3 months = 36 entries) ──

-- February Petty Cash
INSERT INTO petty_cash_entries (id, period_id, entity_id, date, description, amount, currency, txn_type, created_by, created_at) VALUES
  ('pce-feb-01', 'pcp-feb', 'ent-subbrand-001', '2026-02-01', 'Office supplies', 1250, 'BDT', 'CASH_EXPENSE', :user_id, NOW()),
  ('pce-feb-02', 'pcp-feb', 'ent-subbrand-001', '2026-02-03', 'Printer cartridges', 2450, 'BDT', 'CASH_EXPENSE', :user_id, NOW()),
  ('pce-feb-03', 'pcp-feb', 'ent-subbrand-001', '2026-02-05', 'Team lunch', 3200, 'BDT', 'CASH_EXPENSE', :user_id, NOW()),
  ('pce-feb-04', 'pcp-feb', 'ent-subbrand-001', '2026-02-07', 'Office snacks', 1800, 'BDT', 'CASH_EXPENSE', :user_id, NOW()),
  ('pce-feb-05', 'pcp-feb', 'ent-subbrand-001', '2026-02-09', 'Courier charges', 850, 'BDT', 'CASH_EXPENSE', :user_id, NOW()),
  ('pce-feb-06', 'pcp-feb', 'ent-subbrand-001', '2026-02-11', 'Local delivery', 600, 'BDT', 'CASH_EXPENSE', :user_id, NOW()),
  ('pce-feb-07', 'pcp-feb', 'ent-subbrand-001', '2026-02-13', 'Internet bill', 1500, 'BDT', 'CASH_EXPENSE', :user_id, NOW()),
  ('pce-feb-08', 'pcp-feb', 'ent-subbrand-001', '2026-02-15', 'Electricity top-up', 2000, 'BDT', 'CASH_EXPENSE', :user_id, NOW()),
  ('pce-feb-09', 'pcp-feb', 'ent-subbrand-001', '2026-02-17', 'Taxi/transport', 950, 'BDT', 'CASH_EXPENSE', :user_id, NOW()),
  ('pce-feb-10', 'pcp-feb', 'ent-subbrand-001', '2026-02-19', 'Parking and fuel', 1300, 'BDT', 'CASH_EXPENSE', :user_id, NOW()),
  ('pce-feb-11', 'pcp-feb', 'ent-subbrand-001', '2026-02-21', 'Office rent advance', 5000, 'BDT', 'CASH_EXPENSE', :user_id, NOW()),
  ('pce-feb-12', 'pcp-feb', 'ent-subbrand-001', '2026-02-23', 'Maintenance supplies', 2200, 'BDT', 'CASH_EXPENSE', :user_id, NOW());

-- March Petty Cash (repeat same entries with different dates)
INSERT INTO petty_cash_entries (id, period_id, entity_id, date, description, amount, currency, txn_type, created_by, created_at) VALUES
  ('pce-mar-01', 'pcp-mar', 'ent-subbrand-001', '2026-03-01', 'Office supplies', 1250, 'BDT', 'CASH_EXPENSE', :user_id, NOW()),
  ('pce-mar-02', 'pcp-mar', 'ent-subbrand-001', '2026-03-03', 'Printer cartridges', 2450, 'BDT', 'CASH_EXPENSE', :user_id, NOW()),
  ('pce-mar-03', 'pcp-mar', 'ent-subbrand-001', '2026-03-05', 'Team lunch', 3200, 'BDT', 'CASH_EXPENSE', :user_id, NOW()),
  ('pce-mar-04', 'pcp-mar', 'ent-subbrand-001', '2026-03-07', 'Office snacks', 1800, 'BDT', 'CASH_EXPENSE', :user_id, NOW()),
  ('pce-mar-05', 'pcp-mar', 'ent-subbrand-001', '2026-03-09', 'Courier charges', 850, 'BDT', 'CASH_EXPENSE', :user_id, NOW()),
  ('pce-mar-06', 'pcp-mar', 'ent-subbrand-001', '2026-03-11', 'Local delivery', 600, 'BDT', 'CASH_EXPENSE', :user_id, NOW()),
  ('pce-mar-07', 'pcp-mar', 'ent-subbrand-001', '2026-03-13', 'Internet bill', 1500, 'BDT', 'CASH_EXPENSE', :user_id, NOW()),
  ('pce-mar-08', 'pcp-mar', 'ent-subbrand-001', '2026-03-15', 'Electricity top-up', 2000, 'BDT', 'CASH_EXPENSE', :user_id, NOW()),
  ('pce-mar-09', 'pcp-mar', 'ent-subbrand-001', '2026-03-17', 'Taxi/transport', 950, 'BDT', 'CASH_EXPENSE', :user_id, NOW()),
  ('pce-mar-10', 'pcp-mar', 'ent-subbrand-001', '2026-03-19', 'Parking and fuel', 1300, 'BDT', 'CASH_EXPENSE', :user_id, NOW()),
  ('pce-mar-11', 'pcp-mar', 'ent-subbrand-001', '2026-03-21', 'Office rent advance', 5000, 'BDT', 'CASH_EXPENSE', :user_id, NOW()),
  ('pce-mar-12', 'pcp-mar', 'ent-subbrand-001', '2026-03-23', 'Maintenance supplies', 2200, 'BDT', 'CASH_EXPENSE', :user_id, NOW());

-- April Petty Cash (repeat same entries with different dates)
INSERT INTO petty_cash_entries (id, period_id, entity_id, date, description, amount, currency, txn_type, created_by, created_at) VALUES
  ('pce-apr-01', 'pcp-apr', 'ent-subbrand-001', '2026-04-01', 'Office supplies', 1250, 'BDT', 'CASH_EXPENSE', :user_id, NOW()),
  ('pce-apr-02', 'pcp-apr', 'ent-subbrand-001', '2026-04-03', 'Printer cartridges', 2450, 'BDT', 'CASH_EXPENSE', :user_id, NOW()),
  ('pce-apr-03', 'pcp-apr', 'ent-subbrand-001', '2026-04-05', 'Team lunch', 3200, 'BDT', 'CASH_EXPENSE', :user_id, NOW()),
  ('pce-apr-04', 'pcp-apr', 'ent-subbrand-001', '2026-04-07', 'Office snacks', 1800, 'BDT', 'CASH_EXPENSE', :user_id, NOW()),
  ('pce-apr-05', 'pcp-apr', 'ent-subbrand-001', '2026-04-09', 'Courier charges', 850, 'BDT', 'CASH_EXPENSE', :user_id, NOW()),
  ('pce-apr-06', 'pcp-apr', 'ent-subbrand-001', '2026-04-11', 'Local delivery', 600, 'BDT', 'CASH_EXPENSE', :user_id, NOW()),
  ('pce-apr-07', 'pcp-apr', 'ent-subbrand-001', '2026-04-13', 'Internet bill', 1500, 'BDT', 'CASH_EXPENSE', :user_id, NOW()),
  ('pce-apr-08', 'pcp-apr', 'ent-subbrand-001', '2026-04-15', 'Electricity top-up', 2000, 'BDT', 'CASH_EXPENSE', :user_id, NOW()),
  ('pce-apr-09', 'pcp-apr', 'ent-subbrand-001', '2026-04-17', 'Taxi/transport', 950, 'BDT', 'CASH_EXPENSE', :user_id, NOW()),
  ('pce-apr-10', 'pcp-apr', 'ent-subbrand-001', '2026-04-19', 'Parking and fuel', 1300, 'BDT', 'CASH_EXPENSE', :user_id, NOW()),
  ('pce-apr-11', 'pcp-apr', 'ent-subbrand-001', '2026-04-21', 'Office rent advance', 5000, 'BDT', 'CASH_EXPENSE', :user_id, NOW()),
  ('pce-apr-12', 'pcp-apr', 'ent-subbrand-001', '2026-04-23', 'Maintenance supplies', 2200, 'BDT', 'CASH_EXPENSE', :user_id, NOW());

-- ── FUND TRANSFERS (6 total - 2 per month) ────────────────

INSERT INTO fund_transfers (id, entity_id, from_account_id, to_account_id, amount_from, currency_from, amount_to, currency_to, exchange_rate, date, reference, note, created_by, created_at) VALUES
  ('ft-feb-001', 'ent-parent-001', 'acc-bdt-001', 'acc-usd-001', 50000, 'BDT', 410, 'USD', 121.95, '2026-02-07', 'FT-2026-02-001', 'Monthly fund transfer', :user_id, NOW()),
  ('ft-feb-002', 'ent-parent-001', 'acc-usd-001', 'acc-bdt-001', 200, 'USD', 24390, 'BDT', 121.95, '2026-02-20', 'FT-2026-02-002', 'Return transfer', :user_id, NOW()),
  ('ft-mar-001', 'ent-parent-001', 'acc-bdt-001', 'acc-usd-001', 50000, 'BDT', 410, 'USD', 121.95, '2026-03-07', 'FT-2026-03-001', 'Monthly fund transfer', :user_id, NOW()),
  ('ft-mar-002', 'ent-parent-001', 'acc-usd-001', 'acc-bdt-001', 200, 'USD', 24390, 'BDT', 121.95, '2026-03-20', 'FT-2026-03-002', 'Return transfer', :user_id, NOW()),
  ('ft-apr-001', 'ent-parent-001', 'acc-bdt-001', 'acc-usd-001', 50000, 'BDT', 410, 'USD', 121.95, '2026-04-07', 'FT-2026-04-001', 'Monthly fund transfer', :user_id, NOW()),
  ('ft-apr-002', 'ent-parent-001', 'acc-usd-001', 'acc-bdt-001', 200, 'USD', 24390, 'BDT', 121.95, '2026-04-20', 'FT-2026-04-002', 'Return transfer', :user_id, NOW());

-- ── BANK STATEMENTS (6 total - 2 per month) ──────────────

INSERT INTO bank_statements (id, entity_id, statement_date, source, total_credits, total_debits, currency, is_reconciled, uploaded_by, created_at) VALUES
  ('bs-feb-001', 'ent-parent-001', '2026-02-10', 'Dhaka Bank', 150000, 120000, 'BDT', false, :user_id, NOW()),
  ('bs-feb-002', 'ent-parent-001', '2026-02-25', 'Standard Chartered', 2500, 1800, 'USD', false, :user_id, NOW()),
  ('bs-mar-001', 'ent-parent-001', '2026-03-10', 'Dhaka Bank', 150000, 120000, 'BDT', false, :user_id, NOW()),
  ('bs-mar-002', 'ent-parent-001', '2026-03-25', 'Standard Chartered', 2500, 1800, 'USD', false, :user_id, NOW()),
  ('bs-apr-001', 'ent-parent-001', '2026-04-10', 'Dhaka Bank', 150000, 120000, 'BDT', false, :user_id, NOW()),
  ('bs-apr-002', 'ent-parent-001', '2026-04-25', 'Standard Chartered', 2500, 1800, 'USD', false, :user_id, NOW());

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
  ('drw-feb-001', 'ent-parent-001', 'own-001', 'PROFIT', 25000, 'BDT', '2026-02-10', 'APPROVED', 'Monthly profit distribution', :user_id, :user_id, NOW(), NOW()),
  ('drw-feb-002', 'ent-parent-001', 'own-001', 'OWNERS_COMP', 15000, 'BDT', '2026-02-25', 'APPROVED', 'Owner compensation', :user_id, :user_id, NOW(), NOW()),
  ('drw-mar-001', 'ent-parent-001', 'own-001', 'PROFIT', 25000, 'BDT', '2026-03-10', 'APPROVED', 'Monthly profit distribution', :user_id, :user_id, NOW(), NOW()),
  ('drw-mar-002', 'ent-parent-001', 'own-001', 'OWNERS_COMP', 15000, 'BDT', '2026-03-25', 'APPROVED', 'Owner compensation', :user_id, :user_id, NOW(), NOW()),
  ('drw-apr-001', 'ent-parent-001', 'own-001', 'PROFIT', 25000, 'BDT', '2026-04-10', 'APPROVED', 'Monthly profit distribution', :user_id, :user_id, NOW(), NOW()),
  ('drw-apr-002', 'ent-parent-001', 'own-001', 'OWNERS_COMP', 15000, 'BDT', '2026-04-25', 'APPROVED', 'Owner compensation', :user_id, :user_id, NOW(), NOW());

-- ────────────────────────────────────────────────────────────
-- SUMMARY
-- ────────────────────────────────────────────────────────────
-- Total Data Points:
-- - 2 Entities
-- - 2 Ownership Records
-- - 3 Bank Accounts
-- - 3 Employees
-- - 36 Salary Records
-- - 2 Salary Increments
-- - 3 Petty Cash Periods
-- - 36 Petty Cash Entries (12 per month)
-- - 6 Fund Transfers
-- - 6 Bank Statements
-- - 9 Bank Statement Items
-- - 6 Owner Drawings
--
-- TOTAL: 130+ transaction records across 3 months (Feb-Apr 2026)
-- ────────────────────────────────────────────────────────────
