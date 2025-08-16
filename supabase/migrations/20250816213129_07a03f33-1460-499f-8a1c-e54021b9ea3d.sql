-- Create address change requests table
CREATE TABLE public.address_change_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  current_address TEXT NOT NULL,
  current_normalized_address TEXT NOT NULL,
  requested_address TEXT NOT NULL,
  requested_normalized_address TEXT NOT NULL,
  requested_formatted_address TEXT,
  requested_place_id TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  admin_notes TEXT,
  metadata JSONB
);

-- Enable RLS
ALTER TABLE public.address_change_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own requests" 
ON public.address_change_requests 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own requests" 
ON public.address_change_requests 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can cancel their own pending requests" 
ON public.address_change_requests 
FOR UPDATE 
USING (user_id = auth.uid() AND status = 'pending')
WITH CHECK (user_id = auth.uid() AND status IN ('pending', 'cancelled'));

CREATE POLICY "Admins can read all requests" 
ON public.address_change_requests 
FOR SELECT 
USING (is_admin());

CREATE POLICY "Admins can update requests" 
ON public.address_change_requests 
FOR UPDATE 
USING (is_admin())
WITH CHECK (is_admin());

-- Create function to handle address change request approvals
CREATE OR REPLACE FUNCTION public.approve_address_change_request(_request_id UUID, _admin_notes TEXT DEFAULT NULL)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  request_record RECORD;
  target_user_id UUID;
BEGIN
  -- Check if user is admin
  IF NOT public.is_admin() THEN
    RETURN QUERY SELECT false, 'Not authorized'::TEXT;
    RETURN;
  END IF;
  
  -- Get the request details
  SELECT * INTO request_record
  FROM public.address_change_requests
  WHERE id = _request_id AND status = 'pending';
  
  IF request_record.id IS NULL THEN
    RETURN QUERY SELECT false, 'Request not found or not pending'::TEXT;
    RETURN;
  END IF;
  
  target_user_id := request_record.user_id;
  
  -- Update the user's address
  UPDATE public.users
  SET 
    address = request_record.requested_address,
    formatted_address = request_record.requested_formatted_address,
    street_name = request_record.requested_normalized_address,
    google_place_id = request_record.requested_place_id,
    updated_at = now()
  WHERE id = target_user_id;
  
  -- Log the address change
  INSERT INTO public.address_change_log (
    user_id,
    old_address,
    new_address,
    old_street_name,
    new_street_name,
    source,
    metadata
  ) VALUES (
    target_user_id,
    request_record.current_address,
    request_record.requested_address,
    request_record.current_normalized_address,
    request_record.requested_normalized_address,
    'admin_approved_request',
    jsonb_build_object(
      'request_id', _request_id,
      'approved_by', auth.uid(),
      'admin_notes', _admin_notes
    )
  );
  
  -- Update the request status
  UPDATE public.address_change_requests
  SET 
    status = 'approved',
    approved_by = auth.uid(),
    approved_at = now(),
    admin_notes = _admin_notes,
    updated_at = now()
  WHERE id = _request_id;
  
  RETURN QUERY SELECT true, 'Address change approved successfully'::TEXT;
END;
$$;

-- Create function to reject address change request
CREATE OR REPLACE FUNCTION public.reject_address_change_request(_request_id UUID, _rejection_reason TEXT, _admin_notes TEXT DEFAULT NULL)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.is_admin() THEN
    RETURN QUERY SELECT false, 'Not authorized'::TEXT;
    RETURN;
  END IF;
  
  -- Update the request status
  UPDATE public.address_change_requests
  SET 
    status = 'rejected',
    approved_by = auth.uid(),
    approved_at = now(),
    rejection_reason = _rejection_reason,
    admin_notes = _admin_notes,
    updated_at = now()
  WHERE id = _request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Request not found or not pending'::TEXT;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, 'Address change request rejected'::TEXT;
END;
$$;