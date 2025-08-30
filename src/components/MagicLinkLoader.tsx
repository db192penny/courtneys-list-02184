import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

export function MagicLinkLoader() {
  const marketingMessages = [
    "Running background checks faster than your neighbor runs rumor checks",
    "Debugging your HOA problems, one contractor at a time",
    "Optimizing your sanity with reliable service providers",
    "Finding you a reliable landscaper that doesn't ghost you",
    "Loading community insights..."
  ];
  
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % marketingMessages.length);
    }, 2500); // Change message every 2.5 seconds
    
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