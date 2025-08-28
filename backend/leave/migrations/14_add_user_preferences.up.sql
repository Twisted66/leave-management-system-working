-- Add user preferences table for notification settings and other user preferences
CREATE TABLE user_preferences (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT true,
  request_updates BOOLEAN DEFAULT true,
  reminder_notifications BOOLEAN DEFAULT true,
  weekly_reports BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id)
);

-- Initialize preferences for all existing employees
INSERT INTO user_preferences (employee_id)
SELECT id FROM employees
WHERE role IN ('employee', 'manager', 'hr')
ON CONFLICT (employee_id) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX idx_user_preferences_employee_id ON user_preferences(employee_id);