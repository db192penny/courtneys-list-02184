
-- Create household_hoa mapping for Marisa specifically
INSERT INTO public.household_hoa (
    household_address,
    normalized_address, 
    hoa_name,
    created_by
) VALUES (
    '9064 Chauvet Wy, Boca Raton, FL 33496, USA',
    '9064 chauvet wy, boca raton, fl 33496, usa',
    'Boca Bridges',
    (SELECT id FROM public.users WHERE email = 'mbs2104@yahoo.com' LIMIT 1)
) ON CONFLICT (normalized_address) DO UPDATE SET
    hoa_name = EXCLUDED.hoa_name,
    updated_at = NOW();
