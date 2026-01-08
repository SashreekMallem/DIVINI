-- Migration to clean up companies table
-- Removes unused columns: industry, company_size, website
-- Ensures culture_notes exists for the single-paste field

-- 1. Drop unused columns safely
ALTER TABLE companies DROP COLUMN IF EXISTS industry;
ALTER TABLE companies DROP COLUMN IF EXISTS company_size;
ALTER TABLE companies DROP COLUMN IF EXISTS website;

-- 2. Ensure culture_notes column exists (it should, but just in case)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'culture_notes') THEN
        ALTER TABLE companies ADD COLUMN culture_notes TEXT;
    END IF;
END $$;

-- 3. Verify applications alignment (just a comment, logic handled in code)
-- Applications table should already link to companies via company_id
-- No changes needed there if relationships are correct.
