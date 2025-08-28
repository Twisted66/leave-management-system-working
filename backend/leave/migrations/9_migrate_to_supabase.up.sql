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

-- Update existing test users with real Supabase user IDs
UPDATE employees SET supabase_id = 'eb49b337-d813-421b-ba5a-d7519e89b7f4' WHERE email = 'admin@example.com';
UPDATE employees SET supabase_id = 'df743da1-7071-4611-ae5e-d4183d2efe16' WHERE email = 'test.employee@gmail.com';

-- Update admin email to match what we created in Supabase
UPDATE employees SET email = 'admin@example.com' WHERE supabase_id = 'eb49b337-d813-421b-ba5a-d7519e89b7f4';

-- Add the new employee user if it doesn't exist
INSERT INTO employees (email, name, department, role, supabase_id, created_at) 
VALUES ('test.employee@gmail.com', 'Test Employee', 'Operations', 'employee', 'df743da1-7071-4611-ae5e-d4183d2efe16', NOW())
ON CONFLICT (supabase_id) DO UPDATE 
SET email = EXCLUDED.email, name = EXCLUDED.name;