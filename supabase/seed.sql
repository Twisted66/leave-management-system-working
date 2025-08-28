-- Initial seed data for local Supabase development

-- Insert a test user into auth.users (this will be done through the Supabase API)
-- We'll create this programmatically

-- Create some basic leave types if they don't exist
-- INSERT INTO leave_types (name, annual_allocation, carry_forward_limit) VALUES
-- ('Annual Leave', 25, 5),
-- ('Sick Leave', 10, 0),
-- ('Personal Leave', 5, 0),
-- ('Maternity/Paternity Leave', 90, 0)
-- ON CONFLICT (name) DO NOTHING;

-- Note: User creation will be handled through the Supabase Auth API
-- This file can be used for other seed data if needed