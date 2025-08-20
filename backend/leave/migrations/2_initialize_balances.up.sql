-- Initialize leave balances for all employees for current year
INSERT INTO employee_leave_balances (employee_id, leave_type_id, year, allocated_days)
SELECT 
  e.id as employee_id,
  lt.id as leave_type_id,
  EXTRACT(YEAR FROM NOW()) as year,
  lt.annual_allocation as allocated_days
FROM employees e
CROSS JOIN leave_types lt
WHERE e.role IN ('employee', 'manager');
