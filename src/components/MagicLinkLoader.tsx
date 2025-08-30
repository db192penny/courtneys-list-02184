import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

export function MagicLinkLoader() {
  const messages = [
    "Finding landscapers who won't ghost you...",
    "Locating painters who actually show up...",
    "Discovering plumbers who answer their phones...",
    "Vetting vendors so you don't have to...",
    "Connecting you with neighbors who've been there...",
    "Loading trusted reviews from real Boca residents...",
    "No fake reviews here, just your neighbors' experiences...",
    "Because your neighbor's opinion matters more than Yelp..."
  ];
  
  const [currentMessage, setCurrentMessage] = useState(messages[0]);
  const [messageIndex, setMessageIndex] = useState(0);
  
  useEffect(() => {
    // Change message every 300ms for a dynamic feel
    const interval = setInterval(() => {
      setMessageIndex(prev => {
        const nextIndex = (prev + 1) % messages.length;
        setCurrentMessage(messages[nextIndex]);
        return nextIndex;
      });
    }, 300);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-background">
      <div className="text-center space-y-6 p-8">
        {/* Logo or Brand Name */}
        <h1 className="text-3xl font-bold text-primary mb-8">
          Courtney's List
        </h1>
        
        {/* Spinner */}
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        
        {/* Dynamic Message */}
        <p className="text-lg text-foreground font-medium animate-pulse max-w-md">
          {currentMessage}
        </p>
        
        {/* Subtle subtext */}
        <p className="text-sm text-muted-foreground mt-4">
          Authenticating your access...
        </p>
      </div>
    </div>
  );
}