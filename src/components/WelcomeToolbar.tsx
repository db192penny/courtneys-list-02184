import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PartyPopper, X } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";

interface WelcomeToolbarProps {
  communitySlug: string;
}

export function WelcomeToolbar({ communitySlug }: WelcomeToolbarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const welcome = searchParams.get("welcome");

  useEffect(() => {
    // Check if welcome parameter is present and user hasn't dismissed it
    const storageKey = `welcome_dismissed_${communitySlug}`;
    const dismissed = localStorage.getItem(storageKey);
    
    if (welcome === "true" && !dismissed) {
      setIsVisible(true);
      // Clean up URL after showing welcome
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete("welcome");
      navigate({ search: newSearchParams.toString() }, { replace: true });
    }
  }, [welcome, communitySlug, searchParams, navigate]);

  const handleDismiss = () => {
    const storageKey = `welcome_dismissed_${communitySlug}`;
    localStorage.setItem(storageKey, "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="animate-fade-in mb-6">
      <Alert className="border-primary bg-primary/5 relative">
        <PartyPopper className="h-5 w-5 text-primary" />
        <div className="pr-8">
          <AlertDescription className="text-sm leading-relaxed">
            <strong>Welcome aboard!</strong> Please try to rate at least 3 vendors you use and more if you see them and having fun :) 
            Please also click on filter for Other categories (Pool, Pest Control, etc) and have fun exploring!
          </AlertDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="absolute right-2 top-2 h-8 w-8 p-0 hover:bg-primary/10"
          aria-label="Dismiss welcome message"
        >
          <X className="h-4 w-4" />
        </Button>
      </Alert>
    </div>
  );
}