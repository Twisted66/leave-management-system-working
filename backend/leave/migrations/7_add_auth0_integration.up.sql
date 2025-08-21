-- Add Auth0 subject identifier to employees table
ALTER TABLE employees ADD COLUMN auth0_sub VARCHAR(255) UNIQUE;

-- Add index for better performance on Auth0 subject lookups
CREATE INDEX idx_employees_auth0_sub ON employees(auth0_sub);

-- Add comments to document the Auth0 integration
COMMENT ON COLUMN employees.auth0_sub IS 'Auth0 subject identifier (sub claim from JWT token)';
