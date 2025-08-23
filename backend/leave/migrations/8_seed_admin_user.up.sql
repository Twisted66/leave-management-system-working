-- First, make password_hash nullable to support Auth0/Supabase authentication
ALTER TABLE employees ALTER COLUMN password_hash DROP NOT NULL;

-- Add a constraint to ensure either password_hash or auth0_sub is present
ALTER TABLE employees ADD CONSTRAINT employees_auth_method_check 
CHECK (
  (password_hash IS NOT NULL AND auth0_sub IS NULL) OR 
  (password_hash IS NULL AND auth0_sub IS NOT NULL)
);

-- Create default admin user for system setup
INSERT INTO employees (
  email, 
  name, 
  department, 
  role, 
  auth0_sub,
  created_at
) VALUES (
  'admin@example.com',
  'System Administrator', 
  'IT', 
  'hr',
  '12345678-1234-1234-1234-123456789abc',
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Create a test manager user
INSERT INTO employees (
  email, 
  name, 
  department, 
  role, 
  auth0_sub,
  created_at
) VALUES (
  'manager@example.com',
  'Test Manager', 
  'Operations', 
  'manager',
  '12345678-1234-1234-1234-123456789def',
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Create a test employee user
INSERT INTO employees (
  email, 
  name, 
  department, 
  role, 
  auth0_sub,
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