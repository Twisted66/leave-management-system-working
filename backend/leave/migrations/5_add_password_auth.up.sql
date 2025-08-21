-- Add password hash column to employees table
ALTER TABLE employees ADD COLUMN password_hash TEXT;

-- Create default password hash for existing users (password: "password123")
-- In production, you would require users to set their own passwords
UPDATE employees SET password_hash = '$2b$12$LQv3c1yqBwEHxv.9UNn/uOi9S8XOZLcoHpedBm25luR6d0qqKxZCy';

-- Make password_hash required for new users
ALTER TABLE employees ALTER COLUMN password_hash SET NOT NULL;

-- Add indexes for better performance
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_role ON employees(role);
