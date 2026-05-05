-- Merge duplicate employees: Keep first ID per name, delete rest
-- Review the output first before uncommenting the DELETE statements

-- Step 1: Identify duplicates and which to keep
WITH duplicates AS (
  SELECT
    TRIM(name) as normalized_name,
    MIN(id) as keep_id,
    ARRAY_AGG(id ORDER BY id) as all_ids,
    COUNT(*) as duplicate_count
  FROM employees
  GROUP BY TRIM(name)
  HAVING COUNT(*) > 1
)
SELECT
  normalized_name,
  keep_id,
  duplicate_count,
  all_ids,
  (SELECT COUNT(*) FROM salaries WHERE employee_id = keep_id) as salaries_on_kept
FROM duplicates
ORDER BY normalized_name;

-- Step 2: Update salary records from duplicates to kept employee
-- UNCOMMENT AFTER REVIEWING STEP 1
/*
WITH duplicates AS (
  SELECT
    TRIM(name) as normalized_name,
    MIN(id) as keep_id,
    ARRAY_AGG(id) as all_ids
  FROM employees
  GROUP BY TRIM(name)
  HAVING COUNT(*) > 1
)
UPDATE salaries s
SET employee_id = d.keep_id
FROM duplicates d
WHERE s.employee_id = ANY(d.all_ids)
  AND s.employee_id != d.keep_id;

-- Step 3: Delete duplicate employee records
WITH duplicates AS (
  SELECT
    TRIM(name) as normalized_name,
    MIN(id) as keep_id,
    ARRAY_AGG(id) as all_ids
  FROM employees
  GROUP BY TRIM(name)
  HAVING COUNT(*) > 1
)
DELETE FROM employees e
WHERE e.id = ANY(
  SELECT UNNEST(all_ids) FROM duplicates d
  WHERE e.id != d.keep_id
);
*/
