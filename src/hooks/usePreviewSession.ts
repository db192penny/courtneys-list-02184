import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { extractStreetName, capitalizeStreetName } from "@/utils/address";
import { formatNameWithLastInitial } from "@/utils/nameFormatting";

export interface PreviewSession {
  id: string;
  session_token: string;
  name: string;
  address: string;
  normalized_address: string;
  formatted_address?: string;
  google_place_id?: string;
  street_name?: string;
  community: string;
  source?: string;
}

const PREVIEW_SESSION_KEY = "preview_session_token";

export const usePreviewSession = () => {
  const [session, setSession] = useState<PreviewSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      const token = localStorage.getItem(PREVIEW_SESSION_KEY);
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("preview_sessions")
          .select("*")
          .eq("session_token", token)
          .gt("expires_at", new Date().toISOString())
          .single();

        if (error) {
          console.warn("Failed to load preview session:", error);
          localStorage.removeItem(PREVIEW_SESSION_KEY);
        } else {
          setSession(data);
        }
      } catch (err) {
        console.warn("Failed to load preview session:", err);
        localStorage.removeItem(PREVIEW_SESSION_KEY);
      }

      setLoading(false);
    };

    loadSession();
  }, []);

  const createSession = async (sessionData: {
    name: string;
    address: string;
    formatted_address?: string;
    google_place_id?: string;
    street_name?: string;
    community: string;
    source?: string;
  }) => {
    try {
      const token = `preview_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      const { data, error } = await supabase
        .from("preview_sessions")
        .insert({
          session_token: token,
          normalized_address: sessionData.address.toLowerCase().trim(),
          ...sessionData,
        })
        .select()
        .single();

      if (error) throw error;

      localStorage.setItem(PREVIEW_SESSION_KEY, token);
      setSession(data);
      
      // Track session creation
      await trackEvent("identity_provided", null, { source: sessionData.source });
      
      return data;
    } catch (error) {
      console.error("Failed to create preview session:", error);
      throw error;
    }
  };

  const trackEvent = async (
    eventType: string, 
    vendorId?: string | null, 
    metadata?: Record<string, any>
  ) => {
    if (!session) return;

    try {
      await supabase
        .from("preview_metrics")
        .insert({
          session_id: session.id,
          event_type: eventType,
          vendor_id: vendorId,
          metadata: metadata || {},
        });
    } catch (error) {
      console.warn("Failed to track event:", error);
    }
  };

  const getAuthorLabel = () => {
    if (!session) return "Neighbor";
    
    const formattedName = formatNameWithLastInitial(session.name);
    const cleanStreet = session.street_name ? extractStreetName(session.street_name) : "";
    const streetName = cleanStreet ? ` on ${capitalizeStreetName(cleanStreet)}` : "";
    return `${formattedName}${streetName}`;
  };

  return {
    session,
    loading,
    createSession,
    trackEvent,
    getAuthorLabel,
    isPreviewMode: !!session,
  };
};