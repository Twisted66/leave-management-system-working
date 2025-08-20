CREATE TABLE employees (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  department VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'employee', -- 'employee', 'manager', 'hr'
  manager_id BIGINT REFERENCES employees(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE leave_types (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  annual_allocation INTEGER NOT NULL, -- days per year
  carry_forward_limit INTEGER DEFAULT 0, -- max days that can be carried forward
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE employee_leave_balances (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES employees(id),
  leave_type_id BIGINT NOT NULL REFERENCES leave_types(id),
  year INTEGER NOT NULL,
  allocated_days INTEGER NOT NULL,
  used_days INTEGER DEFAULT 0,
  carried_forward_days INTEGER DEFAULT 0,
  UNIQUE(employee_id, leave_type_id, year)
);

CREATE TABLE leave_requests (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES employees(id),
  leave_type_id BIGINT NOT NULL REFERENCES leave_types(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_requested INTEGER NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  manager_comments TEXT,
  approved_by BIGINT REFERENCES employees(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE leave_documents (
  id BIGSERIAL PRIMARY KEY,
  leave_request_id BIGINT NOT NULL REFERENCES leave_requests(id),
  filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default leave types
INSERT INTO leave_types (name, annual_allocation, carry_forward_limit) VALUES
('Annual Leave', 25, 5),
('Sick Leave', 10, 0),
('Personal Leave', 5, 0),
('Maternity/Paternity Leave', 90, 0);

-- Insert sample employees
INSERT INTO employees (email, name, department, role) VALUES
('hr@company.com', 'HR Admin', 'Human Resources', 'hr'),
('manager1@company.com', 'John Manager', 'Engineering', 'manager'),
('manager2@company.com', 'Sarah Manager', 'Marketing', 'manager'),
('employee1@company.com', 'Alice Employee', 'Engineering', 'employee'),
('employee2@company.com', 'Bob Employee', 'Engineering', 'employee'),
('employee3@company.com', 'Carol Employee', 'Marketing', 'employee');

-- Set manager relationships
UPDATE employees SET manager_id = (SELECT id FROM employees WHERE email = 'manager1@company.com') 
WHERE email IN ('employee1@company.com', 'employee2@company.com');

UPDATE employees SET manager_id = (SELECT id FROM employees WHERE email = 'manager2@company.com') 
WHERE email = 'employee3@company.com';
