-- Migrate from Auth0 to Supabase authentication
-- Rename auth0_sub column to supabase_id for clarity
ALTER TABLE employees RENAME COLUMN auth0_sub TO supabase_id;

-- Drop the old constraint that referenced auth0_sub
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_auth_method_check;

-- Add new constraint with supabase_id
ALTER TABLE employees ADD CONSTRAINT employees_auth_method_check 
CHECK (
  (password_hash IS NOT NULL AND supabase_id IS NULL) OR 
  (password_hash IS NULL AND supabase_id IS NOT NULL)
);

-- Drop old index and create new one
DROP INDEX IF EXISTS idx_employees_auth0_sub;
CREATE INDEX idx_employees_supabase_id ON employees(supabase_id);

-- Update column comment
COMMENT ON COLUMN employees.supabase_id IS 'Supabase user identifier (sub claim from JWT token)';

-- Update existing test users with proper Supabase UUID format IDs
UPDATE employees SET supabase_id = '12345678-1234-1234-1234-123456789abc' WHERE email = 'admin@example.com';
UPDATE employees SET supabase_id = '12345678-1234-1234-1234-123456789def' WHERE email = 'manager@example.com';  
UPDATE employees SET supabase_id = '12345678-1234-1234-1234-123456789ghi' WHERE email = 'employee@example.com';