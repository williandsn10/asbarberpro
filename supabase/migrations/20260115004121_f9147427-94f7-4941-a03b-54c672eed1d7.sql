-- Adicionar valor 'pending' ao enum appointment_status
ALTER TYPE appointment_status ADD VALUE 'pending' BEFORE 'scheduled';