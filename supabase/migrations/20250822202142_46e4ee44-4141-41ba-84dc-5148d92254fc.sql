-- Delete specific review from db@fivefourventures.com for Joni Gavin
DELETE FROM public.reviews 
WHERE id = '4f439318-4be5-4b0f-98f5-0a1bc8084b2d'
  AND user_id = (SELECT id FROM public.users WHERE email = 'db@fivefourventures.com')
  AND vendor_id = (SELECT id FROM public.vendors WHERE name = 'Joni Gavin');