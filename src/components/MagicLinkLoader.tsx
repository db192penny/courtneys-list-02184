import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface MagicLinkLoaderProps {
  communityName?: string;
  communityPhotoUrl?: string;
}

export function MagicLinkLoader({ communityName, communityPhotoUrl }: MagicLinkLoaderProps = {}) {
  const marketingMessages = [
    "Finding you a reliable landscaper that doesn't ghost you",
    "Running background checks faster than your neighbor runs rumor checks",
    "Debugging your HOA problems, one contractor at a time",
    "Optimizing your sanity with reliable service providers",
    "Loading community insights..."
  ];
  
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % marketingMessages.length);
    }, 2500); // Change message every 2.5 seconds
    
    return () => clearInterval(interval);
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-background">
      <div className="text-center space-y-6 p-8">
        {/* Community Image with Glow */}
        {communityName && (
          <div className="flex justify-center mb-4">
            {communityPhotoUrl ? (
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
                <img 
                  src={communityPhotoUrl} 
                  alt={communityName}
                  className="relative w-24 h-24 rounded-full object-cover ring-2 ring-primary/50 shadow-lg"
                />
              </div>
            ) : (
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center ring-2 ring-primary/50 shadow-lg">
                  <span className="text-2xl font-bold text-white">
                    {getInitials(communityName)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Logo or Brand Name */}
        <h1 className="text-3xl font-bold text-primary mb-8">
          {communityName ? `Hi ${communityName}!` : "Courtney's List"}
        </h1>
        
        {/* Spinner */}
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        
        {/* Dynamic Message */}
        <p className="text-lg text-foreground font-medium animate-pulse max-w-md">
          {marketingMessages[currentMessageIndex]}
        </p>
        
        {/* Subtle subtext */}
        <p className="text-sm text-muted-foreground mt-4">
          Authenticating your access...
        </p>
      </div>
    </div>
  );
}