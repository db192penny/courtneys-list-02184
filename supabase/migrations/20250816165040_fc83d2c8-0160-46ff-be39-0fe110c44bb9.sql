-- Restore db@fivefourventures.com address back to 17443 Rosella Rd
UPDATE public.users 
SET address = '17443 rosella rd, boca raton, fl 33496, usa',
    street_name = 'rosella rd',
    updated_at = now()
WHERE email = 'db@fivefourventures.com';

-- Verify the address is properly mapped and approved
SELECT 
  u.email,
  u.address,
  u.street_name,
  h.hoa_name,
  CASE WHEN ah.household_address IS NOT NULL THEN 'approved' ELSE 'not approved' END as approval_status,
  CASE WHEN ha.user_id IS NOT NULL THEN 'hoa admin' ELSE 'not admin' END as admin_status
FROM public.users u
LEFT JOIN public.household_hoa h ON h.household_address = public.normalize_address(u.address)
LEFT JOIN public.approved_households ah ON ah.household_address = public.normalize_address(u.address)
LEFT JOIN public.hoa_admins ha ON ha.user_id = u.id
WHERE u.email = 'db@fivefourventures.com';