-- Add the authenticated user from production testing
INSERT INTO employees (email, name, department, role, supabase_id, created_at) 
VALUES (
  'authenticated.user@company.com', 
  'Authenticated User', 
  'Engineering', 
  'employee', 
  '8655f244-a017-4032-9a7e-9fc2cce53966', 
  NOW()
) ON CONFLICT (supabase_id) DO UPDATE 
SET 
  email = EXCLUDED.email, 
  name = EXCLUDED.name,
  department = EXCLUDED.department,
  role = EXCLUDED.role;