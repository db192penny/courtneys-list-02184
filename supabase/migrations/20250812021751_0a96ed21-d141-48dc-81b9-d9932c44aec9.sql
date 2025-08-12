-- Create table for community assets if it does not exist
CREATE TABLE IF NOT EXISTS public.community_assets (
  hoa_name text NOT NULL,
  address_line text,
  photo_path text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

-- Enable RLS on the new table
ALTER TABLE public.community_assets ENABLE ROW LEVEL SECURITY;

-- Policies for community_assets
DROP POLICY IF EXISTS "Anyone can read community assets" ON public.community_assets;
CREATE POLICY "Anyone can read community assets"
ON public.community_assets
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "HOA admins can insert community asset" ON public.community_assets;
CREATE POLICY "HOA admins can insert community asset"
ON public.community_assets
FOR INSERT
WITH CHECK (
  public.is_user_hoa_admin()
  AND EXISTS (
    SELECT 1 FROM public.get_my_hoa() g(hoa_name)
    WHERE lower(g.hoa_name) = lower(community_assets.hoa_name)
  )
);

DROP POLICY IF EXISTS "HOA admins can update community asset" ON public.community_assets;
CREATE POLICY "HOA admins can update community asset"
ON public.community_assets
FOR UPDATE
USING (
  public.is_user_hoa_admin()
  AND EXISTS (
    SELECT 1 FROM public.get_my_hoa() g(hoa_name)
    WHERE lower(g.hoa_name) = lower(community_assets.hoa_name)
  )
)
WITH CHECK (
  public.is_user_hoa_admin()
  AND EXISTS (
    SELECT 1 FROM public.get_my_hoa() g(hoa_name)
    WHERE lower(g.hoa_name) = lower(community_assets.hoa_name)
  )
);

DROP POLICY IF EXISTS "HOA admins can delete community asset" ON public.community_assets;
CREATE POLICY "HOA admins can delete community asset"
ON public.community_assets
FOR DELETE
USING (
  public.is_user_hoa_admin()
  AND EXISTS (
    SELECT 1 FROM public.get_my_hoa() g(hoa_name)
    WHERE lower(g.hoa_name) = lower(community_assets.hoa_name)
  )
);

-- Triggers to maintain metadata
DROP TRIGGER IF EXISTS trg_set_community_assets_updated_at ON public.community_assets;
CREATE TRIGGER trg_set_community_assets_updated_at
BEFORE UPDATE ON public.community_assets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_set_community_assets_updated_by ON public.community_assets;
CREATE TRIGGER trg_set_community_assets_updated_by
BEFORE INSERT OR UPDATE ON public.community_assets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_by();

-- Ensure storage bucket exists for community photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-photos', 'community-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for community photos
DROP POLICY IF EXISTS "Community photos are publicly accessible" ON storage.objects;
CREATE POLICY "Community photos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'community-photos');

DROP POLICY IF EXISTS "HOA admins can insert community photos" ON storage.objects;
CREATE POLICY "HOA admins can insert community photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'community-photos'
  AND public.is_user_hoa_admin()
  AND EXISTS (
    SELECT 1 FROM public.get_my_hoa() g(hoa_name)
    WHERE lower(g.hoa_name) = lower((storage.foldername(name))[1])
  )
);

DROP POLICY IF EXISTS "HOA admins can update community photos" ON storage.objects;
CREATE POLICY "HOA admins can update community photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'community-photos'
  AND public.is_user_hoa_admin()
  AND EXISTS (
    SELECT 1 FROM public.get_my_hoa() g(hoa_name)
    WHERE lower(g.hoa_name) = lower((storage.foldername(name))[1])
  )
)
WITH CHECK (
  bucket_id = 'community-photos'
  AND public.is_user_hoa_admin()
  AND EXISTS (
    SELECT 1 FROM public.get_my_hoa() g(hoa_name)
    WHERE lower(g.hoa_name) = lower((storage.foldername(name))[1])
  )
);

DROP POLICY IF EXISTS "HOA admins can delete community photos" ON storage.objects;
CREATE POLICY "HOA admins can delete community photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'community-photos'
  AND public.is_user_hoa_admin()
  AND EXISTS (
    SELECT 1 FROM public.get_my_hoa() g(hoa_name)
    WHERE lower(g.hoa_name) = lower((storage.foldername(name))[1])
  )
);