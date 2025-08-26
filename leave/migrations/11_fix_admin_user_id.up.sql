-- Update admin user to use the correct authenticated Supabase ID
UPDATE employees 
SET supabase_id = '8655f244-a017-4032-9a7e-9fc2cce53966'
WHERE email = 'admin@example.com' AND role = 'hr';

-- Verify the update worked
SELECT id, email, name, role, supabase_id FROM employees WHERE role = 'hr';