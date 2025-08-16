import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AddressChangeRequest {
  id: string;
  user_id: string;
  current_address: string;
  requested_address: string;
  requested_formatted_address?: string;
  reason?: string;
  status: string;
  created_at: string;
  updated_at: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  admin_notes?: string;
}

export function useAddressChangeRequests() {
  const [requests, setRequests] = useState<AddressChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('address_change_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching address change requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  return {
    requests,
    loading,
    refetch: fetchRequests
  };
}

export function useUserAddressChangeRequests() {
  const [userRequests, setUserRequests] = useState<AddressChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserRequests = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('address_change_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserRequests(data || []);
    } catch (error) {
      console.error('Error fetching user address change requests:', error);
      setUserRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const createRequest = async (requestData: {
    current_address: string;
    current_normalized_address: string;
    requested_address: string;
    requested_normalized_address: string;
    requested_formatted_address?: string;
    requested_place_id?: string;
    reason?: string;
  }) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('address_change_requests')
      .insert({
        user_id: user.user.id,
        ...requestData,
      })
      .select()
      .single();

    if (error) throw error;
    
    await fetchUserRequests();
    return data;
  };

  const cancelRequest = async (requestId: string) => {
    const { error } = await supabase
      .from('address_change_requests')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('status', 'pending');

    if (error) throw error;
    await fetchUserRequests();
  };

  useEffect(() => {
    fetchUserRequests();
  }, []);

  return {
    userRequests,
    loading,
    createRequest,
    cancelRequest,
    refetch: fetchUserRequests
  };
}