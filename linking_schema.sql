-- Add default_floor_id to restaurants
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS default_floor_id uuid references public.floors(id);

-- Add floor_id to day_configurations
ALTER TABLE public.day_configurations 
ADD COLUMN IF NOT EXISTS floor_id uuid references public.floors(id);
