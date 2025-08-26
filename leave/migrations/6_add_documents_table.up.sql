CREATE TABLE company_documents (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  document_type VARCHAR(100) NOT NULL, -- 'license', 'certificate', 'policy', 'other'
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER NOT NULL,
  expiry_date DATE,
  uploaded_by BIGINT NOT NULL REFERENCES employees(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for better performance
CREATE INDEX idx_company_documents_type ON company_documents(document_type);
CREATE INDEX idx_company_documents_expiry ON company_documents(expiry_date);
CREATE INDEX idx_company_documents_uploaded_by ON company_documents(uploaded_by);
