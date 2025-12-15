-- DETRAN-SP v2 Seed Data
-- Initial data for operations

-- =============================================================================
-- Driver License Renewal Operation
-- =============================================================================
INSERT INTO operations (name, description, price, required_fields) VALUES (
    'driver_license_renewal',
    'Renovação da CNH - Carteira Nacional de Habilitação. Processo completo de renovação incluindo exames médico e psicotécnico.',
    50000,  -- 50,000 satoshis (~$50 USD)
    '{
        "cpf": {"type": "string", "label": "CPF", "required": true, "pattern": "^[0-9]{11}$"},
        "cnh_number": {"type": "string", "label": "Número da CNH", "required": true},
        "cnh_mirror": {"type": "string", "label": "Espelho da CNH", "required": true}
    }'::jsonb
) ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    required_fields = EXCLUDED.required_fields;
