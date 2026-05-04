import * as fs from "fs";

interface Entry {
  date: string;
  description: string;
  amount: number;
  category: string;
  entity?: string;
}

const args = process.argv.slice(2);
const jsonFile = args[0];
const defaultEntityId = args[1];

if (!jsonFile || !defaultEntityId) {
  console.error("Usage: npx ts-node scripts/generate-import-sql.ts <json-file> <default-entity-id>");
  process.exit(1);
}

const content = fs.readFileSync(jsonFile, "utf-8");
const data = JSON.parse(content);
const entries: Entry[] = Array.isArray(data) ? data : data.entries || [];

// Petty cash periods (you'll need to update these with your actual period IDs)
const pettyCashPeriods: Record<number, { id: string; start: string; end: string }> = {
  2018: { id: "period-2018", start: "2018-01-01", end: "2018-12-31" },
  2019: { id: "period-2019", start: "2019-01-01", end: "2019-12-31" },
  2020: { id: "period-2020", start: "2020-01-01", end: "2020-12-31" },
  2021: { id: "period-2021", start: "2021-01-01", end: "2021-12-31" },
  2022: { id: "period-2022", start: "2022-01-01", end: "2022-12-31" },
  2023: { id: "period-2023", start: "2023-01-01", end: "2023-12-31" },
  2024: { id: "period-2024", start: "2024-01-01", end: "2024-12-31" },
  2025: { id: "period-2025", start: "2025-01-01", end: "2025-12-31" },
  2026: { id: "period-2026", start: "2026-01-01", end: "2026-12-31" },
};

// Entity map (update with your entity IDs)
const entityMap: Record<string, string> = {
  "default": defaultEntityId,
};

function getPettyCashPeriodId(date: string): string | null {
  const dateObj = new Date(date);
  const year = dateObj.getFullYear();
  const period = pettyCashPeriods[year];
  if (!period) {
    console.warn(`No petty cash period found for date: ${date}`);
    return null;
  }
  return period.id;
}

function getEntityId(entityName?: string): string {
  if (!entityName) return defaultEntityId;
  const mapped = entityMap[entityName.toLowerCase()];
  return mapped || defaultEntityId;
}

function escapeSQL(str: string): string {
  return str.replace(/'/g, "''");
}

function generateSQL(): string {
  let sql = "-- Import generated SQL\n";
  sql += `-- Generated: ${new Date().toISOString()}\n`;
  sql += `-- Total entries: ${entries.length}\n\n`;

  sql += "BEGIN TRANSACTION;\n\n";

  // Get OPEX and Petty Cash Float account IDs (you'll need to update these)
  sql += "-- Account IDs (update these with your actual IDs from chart_of_accounts)\n";
  sql += "-- SELECT id, account_code, pf_account FROM chart_of_accounts WHERE pf_account = 'OPEX' OR account_code = '1200';\n\n";

  const pettyCashInserts: string[] = [];
  const journalInserts: string[] = [];
  const journalLineInserts: string[] = [];

  const importBatchId = `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  let journalIdCounter = 1000; // Start from arbitrary high number

  for (const entry of entries) {
    const periodId = getPettyCashPeriodId(entry.date);
    if (!periodId) continue;

    const entityId = getEntityId(entry.entity);
    const date = new Date(entry.date).toISOString().split("T")[0];
    const description = escapeSQL(entry.description);
    const amount = Math.abs(entry.amount);
    const category = escapeSQL(entry.category);

    const journalId = `je-${importBatchId}-${journalIdCounter++}`;

    // Petty cash entry
    pettyCashInserts.push(
      `('${periodId}', '${entityId}', '${date}', '${description}', ${amount}, 'BDT', NULL, NULL, NOW(), NOW())`
    );

    // Journal entry
    journalInserts.push(
      `('${journalId}', '${entityId}', '${date}', '${description}', 'FINALIZED', '${category}', NULL, 'SYSTEM', '${importBatchId}', NOW(), NOW())`
    );

    // Journal lines (you need to replace OPEX_ID and PETTY_CASH_ID with actual IDs)
    // DEBIT line
    journalLineInserts.push(
      `('${journalId}', 'OPEX_ID', 'OPEX', 'DEBIT', ${amount}, 'BDT', NULL, '${entityId}', NOW(), NOW())`
    );

    // CREDIT line
    journalLineInserts.push(
      `('${journalId}', 'PETTY_CASH_ID', NULL, 'CREDIT', ${amount}, 'BDT', NULL, '${entityId}', NOW(), NOW())`
    );
  }

  // Generate batch inserts
  if (pettyCashInserts.length > 0) {
    sql += "-- Insert petty cash entries\n";
    sql += "INSERT INTO petty_cash_entry (period_id, entity_id, date, description, amount, currency, created_by_id, journal_entry_id, created_at, updated_at)\n";
    sql += "VALUES\n";
    sql += pettyCashInserts.join(",\n") + ";\n\n";
  }

  if (journalInserts.length > 0) {
    sql += "-- Insert journal entries\n";
    sql += "INSERT INTO journal_entry (id, entity_id, date, description, status, category, created_by_id, created_by_role, import_batch, created_at, updated_at)\n";
    sql += "VALUES\n";
    sql += journalInserts.join(",\n") + ";\n\n";
  }

  if (journalLineInserts.length > 0) {
    sql += "-- Insert journal lines (REPLACE OPEX_ID and PETTY_CASH_ID with actual account IDs)\n";
    sql += "INSERT INTO journal_line (journal_entry_id, account_id, pf_account, entry_type, amount, currency, usd_amount, entity_id, created_at, updated_at)\n";
    sql += "VALUES\n";
    sql += journalLineInserts.join(",\n") + ";\n\n";
  }

  sql += "COMMIT;\n";

  return sql;
}

const sql = generateSQL();
console.log(sql);

// Also save to file
const outputFile = jsonFile.replace(".json", ".sql");
fs.writeFileSync(outputFile, sql);
console.error(`\n✓ SQL generated: ${outputFile}`);
console.error(`Note: Update the petty cash period IDs and account IDs in the script before running!`);
