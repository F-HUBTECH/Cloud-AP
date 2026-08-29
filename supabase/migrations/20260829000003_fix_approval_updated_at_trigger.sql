-- The deployed approvals table has no updated_at column.
-- Remove the legacy trigger that calls set_updated_at() on approvals.
DROP TRIGGER IF EXISTS set_updated_at_approvals ON approvals;
