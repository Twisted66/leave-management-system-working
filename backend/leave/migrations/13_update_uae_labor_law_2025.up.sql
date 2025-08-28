-- Update leave types to comply with UAE Labor Law 2025
-- This migration updates the leave allocation to match the new UAE labor law requirements

-- Update Annual Leave from 25 to 30 days (UAE Labor Law 2025 update)
UPDATE leave_types 
SET annual_allocation = 30 
WHERE name = 'Annual Leave';

-- Update Maternity Leave from 90 to 60 days (UAE Labor Law 2025 update)
UPDATE leave_types 
SET annual_allocation = 60 
WHERE name = 'Maternity/Paternity Leave';

-- Add new leave types required by UAE Labor Law 2025
INSERT INTO leave_types (name, annual_allocation, carry_forward_limit) VALUES
('Parental Leave', 5, 0),     -- Additional parental leave beyond maternity/paternity
('Study Leave', 10, 0),       -- Educational leave for employees
('Hajj Leave', 30, 0),        -- Religious pilgrimage leave (once in employment)
('Bereavement Leave', 3, 0);  -- Family bereavement leave

-- Update sick leave structure - create a new table for tiered sick leave tracking
CREATE TABLE sick_leave_tiers (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES employees(id),
  year INTEGER NOT NULL,
  full_pay_days_used INTEGER DEFAULT 0,      -- Out of 15 days full pay
  half_pay_days_used INTEGER DEFAULT 0,      -- Out of 30 days half pay  
  unpaid_days_used INTEGER DEFAULT 0,        -- Out of 45 days unpaid
  UNIQUE(employee_id, year)
);

-- Initialize sick leave tiers for all existing employees
INSERT INTO sick_leave_tiers (employee_id, year)
SELECT e.id, EXTRACT(YEAR FROM NOW())
FROM employees e
WHERE e.role IN ('employee', 'manager')
ON CONFLICT (employee_id, year) DO NOTHING;

-- Update existing employee leave balances for new leave types
INSERT INTO employee_leave_balances (employee_id, leave_type_id, year, allocated_days)
SELECT 
  e.id as employee_id,
  lt.id as leave_type_id,
  EXTRACT(YEAR FROM NOW()) as year,
  lt.annual_allocation as allocated_days
FROM employees e
CROSS JOIN leave_types lt
WHERE e.role IN ('employee', 'manager')
  AND lt.name IN ('Parental Leave', 'Study Leave', 'Hajj Leave', 'Bereavement Leave')
ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING;

-- Update existing Annual Leave balances to 30 days for current year
UPDATE employee_leave_balances 
SET allocated_days = 30
WHERE leave_type_id = (SELECT id FROM leave_types WHERE name = 'Annual Leave')
  AND year = EXTRACT(YEAR FROM NOW());

-- Update existing Maternity/Paternity Leave balances to 60 days for current year
UPDATE employee_leave_balances 
SET allocated_days = 60
WHERE leave_type_id = (SELECT id FROM leave_types WHERE name = 'Maternity/Paternity Leave')
  AND year = EXTRACT(YEAR FROM NOW());