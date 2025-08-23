-- First, make password_hash nullable to support Supabase authentication
ALTER TABLE employees ALTER COLUMN password_hash DROP NOT NULL;

-- Add a constraint to ensure either password_hash or supabase_id is present (will be updated in migration 9)
ALTER TABLE employees ADD CONSTRAINT employees_auth_method_check 
CHECK (
  (password_hash IS NOT NULL AND supabase_id IS NULL) OR 
  (password_hash IS NULL AND supabase_id IS NOT NULL)
);

-- Create default admin user for system setup with proper Supabase UUID format
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
  'IT', 
  'hr',
  '12345678-1234-1234-1234-123456789abc',
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Create a test manager user with proper Supabase UUID format
INSERT INTO employees (
  email, 
  name, 
  department, 
  role, 
  supabase_id,
  created_at
) VALUES (
  'manager@example.com',
  'Test Manager', 
  'Operations', 
  'manager',
  '12345678-1234-1234-1234-123456789def',
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Create a test employee user with proper Supabase UUID format
INSERT INTO employees (
  email, 
  name, 
  department, 
  role, 
  supabase_id,
  manager_id,
  created_at
) VALUES (
  'employee@example.com',
  'Test Employee', 
  'Operations', 
  'employee',
  '12345678-1234-1234-1234-123456789ghi',
  (SELECT id FROM employees WHERE email = 'manager@example.com'),
  NOW()
) ON CONFLICT (email) DO NOTHING;