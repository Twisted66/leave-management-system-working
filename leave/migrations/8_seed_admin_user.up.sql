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
  'eb49b337-d813-421b-ba5a-d7519e89b7f4',
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
  'test.employee@gmail.com',
  'Test Employee', 
  'Operations', 
  'employee',
  'df743da1-7071-4611-ae5e-d4183d2efe16',
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Additional users can be added here