-- Add account classification and normal balance while preserving existing
-- account_type/level_no/parent_code fields used by the current UI.
ALTER TABLE gl_accounts
  ADD COLUMN IF NOT EXISTS account_category varchar(20),
  ADD COLUMN IF NOT EXISTS normal_balance varchar(10);

-- Best-effort migration for existing standard account codes.
UPDATE gl_accounts
SET account_category = CASE left(code, 1)
  WHEN '1' THEN 'asset'
  WHEN '2' THEN 'liability'
  WHEN '3' THEN 'equity'
  WHEN '4' THEN 'revenue'
  WHEN '5' THEN 'expense'
  WHEN '6' THEN 'expense'
  ELSE 'asset'
END,
normal_balance = CASE left(code, 1)
  WHEN '1' THEN 'debit'
  WHEN '2' THEN 'credit'
  WHEN '3' THEN 'credit'
  WHEN '4' THEN 'credit'
  WHEN '5' THEN 'debit'
  WHEN '6' THEN 'debit'
  ELSE 'debit'
END
WHERE account_category IS NULL OR normal_balance IS NULL;

ALTER TABLE gl_accounts
  ALTER COLUMN account_category SET DEFAULT 'asset',
  ALTER COLUMN account_category SET NOT NULL,
  ALTER COLUMN normal_balance SET DEFAULT 'debit',
  ALTER COLUMN normal_balance SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gl_accounts_account_category_check') THEN
    ALTER TABLE gl_accounts ADD CONSTRAINT gl_accounts_account_category_check
      CHECK (account_category IN ('asset', 'liability', 'equity', 'revenue', 'expense'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gl_accounts_normal_balance_check') THEN
    ALTER TABLE gl_accounts ADD CONSTRAINT gl_accounts_normal_balance_check
      CHECK (normal_balance IN ('debit', 'credit'));
  END IF;
END $$;
