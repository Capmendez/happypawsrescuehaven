-- Drop NOT NULL constraint on account_number to allow it to be empty for non-bank payment methods
ALTER TABLE public.bank_accounts ALTER COLUMN account_number DROP NOT NULL;
