CREATE TABLE absence_records (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES employees(id),
  absence_date DATE NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_by BIGINT NOT NULL REFERENCES employees(id), -- HR who marked the absence
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE absence_conversion_requests (
  id BIGSERIAL PRIMARY KEY,
  absence_record_id BIGINT NOT NULL REFERENCES absence_records(id),
  employee_id BIGINT NOT NULL REFERENCES employees(id),
  justification TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  manager_comments TEXT,
  approved_by BIGINT REFERENCES employees(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for better performance
CREATE INDEX idx_absence_records_employee_date ON absence_records(employee_id, absence_date);
CREATE INDEX idx_absence_conversion_requests_employee ON absence_conversion_requests(employee_id);
CREATE INDEX idx_absence_conversion_requests_status ON absence_conversion_requests(status);
