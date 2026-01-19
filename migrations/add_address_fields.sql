-- ===========================================
-- MIGRATION: Address fields for customers & restaurants
-- Run this in Supabase SQL Editor
-- ===========================================

-- 1. Add location columns to restaurants (for map integration)
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS latitude numeric NULL,
ADD COLUMN IF NOT EXISTS longitude numeric NULL,
ADD COLUMN IF NOT EXISTS google_place_id text NULL;

COMMENT ON COLUMN restaurants.latitude IS 'Latitude from Google Places';
COMMENT ON COLUMN restaurants.longitude IS 'Longitude from Google Places';
COMMENT ON COLUMN restaurants.google_place_id IS 'Google Place ID for the restaurant';

-- 2. Add detailed address fields to customers (for delivery)
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS address_floor text NULL,
ADD COLUMN IF NOT EXISTS address_apartment text NULL,
ADD COLUMN IF NOT EXISTS delivery_notes text NULL;

COMMENT ON COLUMN customers.address_floor IS 'Piso del edificio';
COMMENT ON COLUMN customers.address_apartment IS 'Departamento/Unidad';
COMMENT ON COLUMN customers.delivery_notes IS 'Observaciones para envío/delivery';

-- Verification: Check columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'customers' 
AND column_name IN ('address_floor', 'address_apartment', 'delivery_notes');

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'restaurants' 
AND column_name IN ('latitude', 'longitude', 'google_place_id');
