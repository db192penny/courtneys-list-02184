-- Create missing home_vendors entries for Courtney (clkramer@gmail.com)
-- Based on her 4+ star reviews where she likely checked "Do you currently use this vendor?"

INSERT INTO public.home_vendors (user_id, vendor_id, currency, period, created_at, updated_at)
SELECT 
    r.user_id,
    r.vendor_id,
    'USD' as currency,
    'monthly' as period,
    r.created_at,
    r.created_at as updated_at
FROM public.reviews r
JOIN public.users u ON u.id = r.user_id
LEFT JOIN public.home_vendors hv ON hv.user_id = r.user_id AND hv.vendor_id = r.vendor_id
WHERE u.email = 'clkramer@gmail.com'
    AND hv.id IS NULL  -- Only insert if home_vendors entry doesn't already exist
    AND r.rating >= 4  -- 4+ star ratings likely had the checkbox checked
ON CONFLICT (user_id, vendor_id) DO NOTHING;