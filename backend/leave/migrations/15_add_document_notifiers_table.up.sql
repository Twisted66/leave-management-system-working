-- Document Notifiers Table for tracking document expiry notifications
CREATE TABLE document_notifiers (
  id BIGSERIAL PRIMARY KEY,
  document_id BIGINT REFERENCES company_documents(id) ON DELETE CASCADE,
  document_name VARCHAR(255) NOT NULL, -- For easier import/export
  user_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  expiry_date DATE NOT NULL,
  notification_frequency VARCHAR(50) NOT NULL DEFAULT 'monthly', -- 'weekly', 'monthly', 'custom'
  custom_frequency_days INTEGER, -- For custom frequency
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'inactive'
  last_notification_sent TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_document_notifiers_document_id ON document_notifiers(document_id);
CREATE INDEX idx_document_notifiers_user_id ON document_notifiers(user_id);
CREATE INDEX idx_document_notifiers_expiry_date ON document_notifiers(expiry_date);
CREATE INDEX idx_document_notifiers_status ON document_notifiers(status);
CREATE INDEX idx_document_notifiers_frequency ON document_notifiers(notification_frequency);

-- Add constraint to ensure custom frequency is set when frequency is 'custom'
ALTER TABLE document_notifiers 
ADD CONSTRAINT check_custom_frequency 
CHECK (
  (notification_frequency != 'custom') OR 
  (notification_frequency = 'custom' AND custom_frequency_days IS NOT NULL)
);

-- Add constraint for valid notification frequencies
ALTER TABLE document_notifiers 
ADD CONSTRAINT check_notification_frequency 
CHECK (notification_frequency IN ('weekly', 'monthly', 'custom'));

-- Add constraint for valid status values
ALTER TABLE document_notifiers 
ADD CONSTRAINT check_status 
CHECK (status IN ('active', 'inactive'));