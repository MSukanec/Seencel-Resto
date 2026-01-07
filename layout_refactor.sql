-- 1. Add default_layout_template_id to restaurants
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS default_layout_template_id uuid references public.layout_templates(id);

-- 2. Modify day_configurations to reference layout_templates
ALTER TABLE public.day_configurations 
DROP COLUMN IF EXISTS floor_id;

ALTER TABLE public.day_configurations 
ADD COLUMN IF NOT EXISTS layout_template_id uuid references public.layout_templates(id);

-- 3. DATA MIGRATION: Move Tables/Bars from floor_objects to a new Default Template

DO $$ 
DECLARE 
    r_record RECORD;
    new_template_id UUID;
BEGIN
    -- For each restaurant that has floor objects of type 'table' or 'bar'
    FOR r_record IN 
        SELECT DISTINCT restaurant_id FROM floors 
        WHERE id IN (SELECT floor_id FROM floor_objects WHERE type IN ('table', 'bar', 'custom-table'))
    LOOP
        -- Check if a template already exists to avoid duplicates if re-run
        SELECT id INTO new_template_id FROM layout_templates 
        WHERE restaurant_id = r_record.restaurant_id AND name = 'Distribución Principal' LIMIT 1;

        -- If not, create it
        IF new_template_id IS NULL THEN
            INSERT INTO layout_templates (restaurant_id, name, description, is_active)
            VALUES (r_record.restaurant_id, 'Distribución Principal', 'Migrado automáticamente', true)
            RETURNING id INTO new_template_id;
        END IF;

        -- Move objects for this restaurant's floors
        -- We interact with the EXISTING layout_template_items table
        INSERT INTO layout_template_items (template_id, floor_id, label, x, y, width, height, shape, seats, angle)
        SELECT 
            new_template_id, 
            floor_id, 
            COALESCE(properties->>'label', 'Mesa ' || substring(id::text, 0, 4)), 
            x, y, width, height, 
            COALESCE(properties->>'shape', 'rectangle'), 
            COALESCE((properties->>'seats')::int, 4), 
            angle
        FROM floor_objects 
        WHERE floor_id IN (SELECT id FROM floors WHERE restaurant_id = r_record.restaurant_id)
          AND type IN ('table', 'bar', 'custom-table');

        -- Set as default for the restaurant
        UPDATE restaurants 
        SET default_layout_template_id = new_template_id 
        WHERE id = r_record.restaurant_id;

    END LOOP;
    
    -- Delete migrated objects from floor_objects
    -- COMMENTED OUT FOR SAFETY. User can delete after verifying migration.
    -- DELETE FROM floor_objects WHERE type IN ('table', 'bar', 'custom-table');

END $$;
