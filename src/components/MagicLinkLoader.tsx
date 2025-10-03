import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface MagicLinkLoaderProps {
  communityName?: string;
}

export function MagicLinkLoader({ communityName: propsCommunityName }: MagicLinkLoaderProps = {}) {
  const [searchParams] = useSearchParams();
  
  // Extract from URL as fallback
  const contextFromUrl = searchParams.get("context") || searchParams.get("community");
  const urlCommunityName = contextFromUrl ? 
    contextFromUrl.split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') 
    : "";
  
  // Use props first, then URL extraction, then default
  const displayName = propsCommunityName || urlCommunityName || "Courtney's List";
  
  console.log("🎯 MagicLinkLoader Debug:");
  console.log("- Props community name:", propsCommunityName);
  console.log("- URL community name:", urlCommunityName);
  console.log("- Final display name:", displayName);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-background">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-3xl font-bold text-primary mb-8">
          Hi {displayName}!
        </h1>
        
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        
        <p className="text-lg text-foreground font-medium animate-pulse max-w-md">
          Finding you a reliable landscaper that doesn't ghost you
        </p>
        
        <p className="text-sm text-muted-foreground mt-4">
          Authenticating your access...
        </p>
      </div>
    </div>
  );
}