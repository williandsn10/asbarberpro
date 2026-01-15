-- Alterar o valor padrão da coluna status para 'pending'
ALTER TABLE appointments ALTER COLUMN status SET DEFAULT 'pending'::appointment_status;