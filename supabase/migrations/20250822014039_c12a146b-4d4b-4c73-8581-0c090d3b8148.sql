
-- Check for other users who signed up via community links but don't have household_hoa mappings
SELECT 
    u.id,
    u.email,
    u.name,
    u.address,
    u.signup_source,
    u.created_at,
    CASE WHEN hh.normalized_address IS NOT NULL THEN 'Has mapping' ELSE 'Missing mapping' END as mapping_status
FROM public.users u
LEFT JOIN public.household_hoa hh ON hh.normalized_address = public.normalize_address(u.address)
WHERE u.signup_source LIKE 'community:%'
ORDER BY u.created_at DESC;
