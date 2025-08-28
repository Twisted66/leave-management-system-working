-- Add default admin user for testing
-- This user will have admin@example.com with password admin123
-- The Supabase user ID is generated and inserted

-- Insert admin user into employees table with a placeholder supabase_id
-- In practice, this user would need to be created in Supabase Auth first
INSERT INTO employees (
  email, 
  name, 
  department, 
  role, 
  supabase_id,
  created_at
) VALUES (
  'admin@example.com',
  'System Administrator',
  'Administration',
  'hr',
  'admin-test-user-supabase-id', -- This should be replaced with actual Supabase user ID
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Note: To fully set up this admin user, you need to:
-- 1. Create the user in Supabase Auth with email admin@example.com and password admin123
-- 2. Update the supabase_id in this record with the actual Supabase user ID
-- 3. The auto-creation logic in the auth handler will handle the rest