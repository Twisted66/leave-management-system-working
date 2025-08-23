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
  'admin-supabase-id',
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
  'manager-supabase-id',
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
  'employee-supabase-id',
  (SELECT id FROM employees WHERE email = 'manager@example.com'),
  NOW()
) ON CONFLICT (email) DO NOTHING;