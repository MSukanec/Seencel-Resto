-- Create junction table for joining customers and guest_attributes
CREATE TABLE IF NOT EXISTS public.customer_tags (
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    attribute_id UUID NOT NULL REFERENCES public.guest_attributes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (customer_id, attribute_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_tags_customer ON public.customer_tags(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_tags_attribute ON public.customer_tags(attribute_id);

-- Enable RLS
ALTER TABLE public.customer_tags ENABLE ROW LEVEL SECURITY;

-- Policy: Select if user has access to the customer (via restaurant)
CREATE POLICY "View customer tags" ON public.customer_tags
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.customers c
            JOIN public.restaurant_members rm ON rm.restaurant_id = c.restaurant_id
            WHERE c.id = customer_tags.customer_id
            AND rm.user_id = auth.uid()
        )
    );

-- Policy: Manage if user has access to the customer
CREATE POLICY "Manage customer tags" ON public.customer_tags
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.customers c
            JOIN public.restaurant_members rm ON rm.restaurant_id = c.restaurant_id
            WHERE c.id = customer_tags.customer_id
            AND rm.user_id = auth.uid()
        )
    );
