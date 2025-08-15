-- Update Dave's address to match household_hoa format for proper community detection
UPDATE public.users 
SET address = '17443 rosella rd, boca raton, fl 33496, usa',
    street_name = 'rosella rd'
WHERE id = 'c2bf9740-eca5-4913-a5a3-620fbc0214b0';

-- Clean up the unknown household_hoa record that was causing issues
DELETE FROM public.household_hoa 
WHERE household_address = 'unknown';