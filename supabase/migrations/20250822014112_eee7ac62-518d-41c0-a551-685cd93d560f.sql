
-- Verify Marisa's household_hoa mapping was created
SELECT 
    hh.*,
    u.email,
    u.name
FROM public.household_hoa hh
JOIN public.users u ON public.normalize_address(u.address) = hh.normalized_address
WHERE u.email = 'mbs2104@yahoo.com';
