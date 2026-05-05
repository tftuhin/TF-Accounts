-- Add employee profile and bank account fields
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS profile_image VARCHAR(500),
ADD COLUMN IF NOT EXISTS email VARCHAR(100),
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(20);
