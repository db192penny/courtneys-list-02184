import { useState, useEffect, useRef } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PartyPopper, X } from "lucide-react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

interface WelcomeToolbarProps {
  communitySlug: string;
}

export function WelcomeToolbar({ communitySlug }: WelcomeToolbarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const welcome = searchParams.get("welcome");
  const autoHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMobile = useIsMobile();

  const cleanupURL = () => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete("welcome");
    navigate({ 
      pathname: location.pathname,
      search: newSearchParams.toString() 
    }, { replace: true });
  };

  const handleDismiss = (isManual = true) => {
    const storageKey = `welcome_dismissed_${communitySlug}`;
    localStorage.setItem(storageKey, "1");
    
    // Clear any pending timeouts
    if (autoHideTimeoutRef.current) {
      clearTimeout(autoHideTimeoutRef.current);
    }
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
    }

    // Start fade out animation
    setIsExiting(true);
    
    // Clean URL immediately if manual dismiss, or after fade if auto
    if (isManual) {
      cleanupURL();
    } else {
      cleanupTimeoutRef.current = setTimeout(cleanupURL, 400); // After fade animation
    }
    
    // Hide after fade animation
    setTimeout(() => setIsVisible(false), 400);
  };

  useEffect(() => {
    // Check if welcome parameter is present and user hasn't dismissed it
    const storageKey = `welcome_dismissed_${communitySlug}`;
    const dismissed = localStorage.getItem(storageKey);
    
    if (welcome === "true" && dismissed !== "1") {
      setIsVisible(true);
      
      // Scroll to top on mobile to ensure welcome message is visible
      if (isMobile) {
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
        // Additional scroll attempt to ensure positioning after any late content loads
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 500);
      }
      
      // Auto-hide after 15 seconds
      autoHideTimeoutRef.current = setTimeout(() => {
        handleDismiss(false); // Auto dismiss
      }, 15000);
    }

    // ESC key handler
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isVisible && !isExiting) {
        handleDismiss(true);
      }
    };

    document.addEventListener("keydown", handleEscKey);
    
    return () => {
      document.removeEventListener("keydown", handleEscKey);
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current);
      }
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
    };
  }, [welcome, communitySlug, isVisible, isExiting]);

  if (!isVisible) return null;

  return (
    <div 
      className={`mb-6 transition-all duration-400 ease-out ${
        isExiting 
          ? "opacity-0 transform translate-y-[-10px]" 
          : "opacity-100 transform translate-y-0 animate-fade-in"
      }`}
      role="status"
      aria-live="polite"
    >
      <Alert className="border-green-500 bg-green-50 relative shadow-md">
        <PartyPopper className="h-5 w-5 text-green-600" />
        <div className="pr-8">
          <AlertDescription className="text-sm leading-relaxed text-green-900">
            <strong>Welcome aboard!</strong> Start rating providers to help neighbors and earn points! Just 3 ratings gets you a $10 Starbucks gift card - coffee on us! ☕
          </AlertDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDismiss(true)}
          className="absolute right-2 top-2 h-8 w-8 p-0 hover:bg-green-100 text-green-700 focus:ring-2 focus:ring-green-400"
          aria-label="Dismiss welcome message"
        >
          <X className="h-4 w-4" />
        </Button>
      </Alert>
    </div>
  );
}