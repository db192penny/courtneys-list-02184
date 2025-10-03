import { useSearchParams } from "react-router-dom";

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50">
      <div className="text-center space-y-8 p-8">
        <div className="relative">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-r from-primary-500 to-accent-500 animate-pulse" />
          <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full bg-gradient-to-r from-primary-500 to-accent-500 animate-ping opacity-30" />
        </div>
        
        <div className="space-y-3">
          <h2 className="text-3xl font-bold text-gray-900">
            Hi {displayName}!
          </h2>
          <p className="text-lg text-gray-600 animate-pulse">
            Setting up your experience...
          </p>
        </div>
        
        <div className="flex justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}