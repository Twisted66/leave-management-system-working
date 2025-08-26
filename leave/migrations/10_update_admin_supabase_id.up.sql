-- Update admin user to use correct Supabase ID
UPDATE employees 
SET supabase_id = '88fe1b6d-7cec-4ae5-9818-9e141447ddd0'
WHERE email = 'admin@example.com' AND role = 'hr';

-- Verify the update
COMMENT ON COLUMN employees.supabase_id IS 'Updated to use real Supabase user ID: 88fe1b6d-7cec-4ae5-9818-9e141447ddd0';