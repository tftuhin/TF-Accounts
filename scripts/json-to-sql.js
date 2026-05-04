#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const jsonFile = args[0];
const defaultEntityId = args[1] || "43ca8312-5099-4c46-8d5f-f73726fe2b77";

if (!jsonFile || !fs.existsSync(jsonFile)) {
  console.error("Usage: node scripts/json-to-sql.js <json-file> [default-entity-id]");
  console.error("Example: node scripts/json-to-sql.js office_expenses.json");
  process.exit(1);
}

// Your database IDs - update these based on your Supabase data
const pettyCashPeriods = [
  { id: "7ddf932d-cfc8-4063-8d4d-52f497191dd2", entityId: "43ca8312-5099-4c46-8d5f-f73726fe2b77", start: "2018-01-01", end: "2018-12-31" },
  { id: "7a0d5698-7ce8-4fa9-a692-c6769b959df2", entityId: "43ca8312-5099-4c46-8d5f-f73726fe2b77", start: "2019-01-01", end: "2019-12-31" },
  { id: "437e6084-dde8-4674-a464-6a07c47124df", entityId: "43ca8312-5099-4c46-8d5f-f73726fe2b77", start: "2020-01-01", end: "2020-12-31" },
  { id: "b055fa19-62f3-458d-ae45-9f5cd51f4e5a", entityId: "43ca8312-5099-4c46-8d5f-f73726fe2b77", start: "2021-01-01", end: "2021-12-31" },
  { id: "5b044d51-b8ca-44c9-8689-2392db5fd206", entityId: "43ca8312-5099-4c46-8d5f-f73726fe2b77", start: "2022-01-01", end: "2022-12-31" },
  { id: "c772c1e6-5e83-4acf-b0a7-80de41d269c4", entityId: "43ca8312-5099-4c46-8d5f-f73726fe2b77", start: "2023-01-01", end: "2023-12-31" },
  { id: "31d347fe-af01-4f75-ad5f-210fda5e9c65", entityId: "43ca8312-5099-4c46-8d5f-f73726fe2b77", start: "2024-01-01", end: "2024-12-31" },
  { id: "4ec30f39-2fba-4974-99d2-49e997cbf3b9", entityId: "906a7fd7-7d1c-4535-83da-18f31f18d5ba", start: "2025-01-01", end: "2025-12-31" },
  { id: "5f545d48-a70f-4a07-9e37-120bbb5156e8", entityId: "43ca8312-5099-4c46-8d5f-f73726fe2b77", start: "2025-01-01", end: "2025-12-31" },
  { id: "ff3aab16-9cba-4e45-add1-c503099b9d39", entityId: "906a7fd7-7d1c-4535-83da-18f31f18d5ba", start: "2026-01-01", end: "2026-12-31" },
  { id: "05758c4d-66b7-4652-b765-f83c979d460e", entityId: "43ca8312-5099-4c46-8d5f-f73726fe2b77", start: "2026-01-01", end: "2026-12-31" },
];

// Account IDs by entity
const accountsByEntity = {
  "43ca8312-5099-4c46-8d5f-f73726fe2b77": {
    opex: "130af22a-b9e8-4fe9-bf91-24ec83887d5e",
    pettyCash: "3f7f117c-5b34-4693-b40d-98a47b8a2f48",
  },
  "837a4e5f-b7ae-47dc-be50-e5bd2dd82fe4": {
    opex: "0507cfda-a248-42db-8d78-8430df18c725",
    pettyCash: null, // Need to create or map
  },
  "906a7fd7-7d1c-4535-83da-18f31f18d5ba": {
    opex: "cb4e110e-6768-47c5-8dcb-a9f1fe439b12",
    pettyCash: "d6adcabd-1f5b-4305-8f8a-36a15a7bd27a",
  },
  "b7d92581-b205-4392-aa9c-40920cfc152b": {
    opex: "b6feefbb-7c3e-40ea-aad0-9cc8e54e439b",
    pettyCash: null, // Need to create or map
  },
  "f9f8c516-a411-4e21-acd6-4ac8ac9a812c": {
    opex: "0ecec06b-f9d9-4d39-a4dd-801041dc414f",
    pettyCash: null, // Need to create or map
  },
};

function getPettyCashPeriodId(date, entityId) {
  const dateObj = new Date(date);
  const period = pettyCashPeriods.find(
    (p) =>
      p.entityId === entityId &&
      new Date(p.start) <= dateObj &&
      dateObj <= new Date(p.end)
  );
  return period ? period.id : null;
}

function escapeSQL(str) {
  if (!str) return "";
  return str.replace(/'/g, "''");
}

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Read JSON
const content = fs.readFileSync(jsonFile, "utf-8");
const data = JSON.parse(content);
const entries = Array.isArray(data) ? data : data.entries || [];

console.error(`📖 Loaded ${entries.length} entries from ${jsonFile}`);

const pettyCashInserts = [];
const journalInserts = [];
const journalLineInserts = [];

let successCount = 0;
let skipCount = 0;

const importBatchId = `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

for (let i = 0; i < entries.length; i++) {
  const entry = entries[i];
  const entityId = defaultEntityId; // Use default since JSON doesn't have proper entity mapping
  const periodId = getPettyCashPeriodId(entry.date, entityId);

  if (!periodId) {
    skipCount++;
    continue;
  }

  const accounts = accountsByEntity[entityId];
  if (!accounts || !accounts.opex || !accounts.pettyCash) {
    skipCount++;
    continue;
  }

  const date = new Date(entry.date).toISOString().split("T")[0];
  const description = escapeSQL(entry.description || "");
  const amount = Math.abs(parseFloat(entry.amount) || 0);
  const category = escapeSQL(entry.category || "Expense");

  if (!amount) {
    skipCount++;
    continue;
  }

  const entryId = generateUUID();
  const journalId = generateUUID();
  const now = new Date().toISOString();

  // Petty cash entry
  pettyCashInserts.push(
    `('${entryId}', '${periodId}', '${entityId}', '${date}', '${description}', ${amount}, 'BDT', NULL, '${journalId}', NULL, NULL, '${now}', '${now}')`
  );

  // Journal entry
  journalInserts.push(
    `('${journalId}', '${entityId}', '${date}', '${description}', 'FINALIZED', '${category}', NULL, 'SYSTEM', '${importBatchId}', '${now}', '${now}')`
  );

  // DEBIT line (OPEX)
  journalLineInserts.push(
    `('${generateUUID()}', '${journalId}', '${accounts.opex}', 'OPEX', 'DEBIT', ${amount}, 'BDT', NULL, '${entityId}', '${now}', '${now}')`
  );

  // CREDIT line (Petty Cash)
  journalLineInserts.push(
    `('${generateUUID()}', '${journalId}', '${accounts.pettyCash}', NULL, 'CREDIT', ${amount}, 'BDT', NULL, '${entityId}', '${now}', '${now}')`
  );

  successCount++;

  if ((i + 1) % 500 === 0) {
    console.error(`Processing... ${i + 1}/${entries.length}`);
  }
}

console.error(`✓ Processed: ${successCount} entries, Skipped: ${skipCount}`);

// Generate SQL
let sql = `-- Generated SQL import\n`;
sql += `-- Generated: ${new Date().toISOString()}\n`;
sql += `-- Import Batch: ${importBatchId}\n`;
sql += `-- Total entries: ${successCount}\n\n`;

sql += `BEGIN TRANSACTION;\n\n`;

if (journalInserts.length > 0) {
  sql += `-- Insert journal entries (${journalInserts.length})\n`;
  sql += `INSERT INTO journal_entries (id, entity_id, date, description, status, category, created_by_id, created_by_role, import_batch, created_at, updated_at)\n`;
  sql += `VALUES\n`;
  sql += journalInserts.join(",\n") + `;\n\n`;
}

if (pettyCashInserts.length > 0) {
  sql += `-- Insert petty cash entries (${pettyCashInserts.length})\n`;
  sql += `INSERT INTO petty_cash_entries (id, period_id, entity_id, date, description, amount, currency, receipt_url, journal_entry_id, created_by_id, txn_type, created_at, updated_at)\n`;
  sql += `VALUES\n`;
  sql += pettyCashInserts.join(",\n") + `;\n\n`;
}

if (journalLineInserts.length > 0) {
  sql += `-- Insert journal lines (${journalLineInserts.length})\n`;
  sql += `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, pf_account, entry_type, amount, currency, usd_amount, entity_id, created_at, updated_at)\n`;
  sql += `VALUES\n`;
  sql += journalLineInserts.join(",\n") + `;\n\n`;
}

sql += `COMMIT;\n`;

// Save to file
const outputFile = jsonFile.replace(/\.json$/, ".sql");
fs.writeFileSync(outputFile, sql);

console.error(`\n✅ SQL file generated: ${outputFile}`);
console.error(`📊 Statistics:`);
console.error(`   - Journal entries: ${journalInserts.length}`);
console.error(`   - Petty cash entries: ${pettyCashInserts.length}`);
console.error(`   - Journal lines: ${journalLineInserts.length}`);
console.log(sql);
