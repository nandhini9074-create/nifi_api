-- Create sequence for partner_mapping_config
CREATE TABLE IF NOT EXISTS partner_mapping_config (
    id SERIAL PRIMARY KEY,
    partner_id VARCHAR(100) NOT NULL UNIQUE,
    mapping_spec JSONB NOT NULL,
    target_table VARCHAR(100) DEFAULT 'normalized_customer',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for normalized customer data
CREATE TABLE IF NOT EXISTS normalized_customer (
    id SERIAL PRIMARY KEY,
    partner_id VARCHAR(100) NOT NULL,
    full_name VARCHAR(200),
    mobile VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample mappings
INSERT INTO partner_mapping_config (partner_id, mapping_spec) VALUES
('EIB', '[
  {
    "operation": "shift",
    "spec": {
      "partner_id": "partner_id",
      "user_name": "full_name",
      "phone": "mobile"
    }
  }
]'::jsonb),
('ADIB', '[
  {
    "operation": "shift",
    "spec": {
      "partner_id": "partner_id",
      "customer_name": "full_name",
      "mobile": "mobile"
    }
  }
]'::jsonb),
('FAB', '[
  {
    "operation": "shift",
    "spec": {
      "partner_id": "partner_id",
      "fullName": "full_name",
      "mobileNumber": "mobile"
    }
  }
]'::jsonb),
('QNB', '[
  {
    "operation": "shift",
    "spec": {
      "partner_id": "partner_id",
      "name": "full_name",
      "phone_number": "mobile"
    }
  }
]'::jsonb)
ON CONFLICT (partner_id) DO UPDATE SET mapping_spec = EXCLUDED.mapping_spec;
