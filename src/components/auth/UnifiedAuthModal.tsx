import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { storeAuthReturnPath } from "@/utils/authRedirect"; // NEW IMPORT

interface UnifiedAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityName?: string;
  context?: "rate" | "reviews" | "costs";
  onSuccess?: () => void;
}

export function UnifiedAuthModal({
  open,
  onOpenChange,
  communityName = "your community",
  context,
  onSuccess,
}: UnifiedAuthModalProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      storeAuthReturnPath(); // NEW LINE - Store current page

      const redirectUrl = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) throw error;
      onSuccess?.();
    } catch (error: any) {
      console.error("Google auth error:", error);
      toast.error("Failed to sign in with Google. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = () => {
    storeAuthReturnPath(); // NEW LINE - Store current page

    const currentPath = window.location.pathname;
    const communityMatch = currentPath.match(/\/communities\/([^\/]+)/);
    const community = communityMatch ? communityMatch[1] : "boca-bridges";
    navigate(`/auth?community=${community}`);
    onOpenChange(false);
  };

  const handleSignIn = () => {
    storeAuthReturnPath(); // NEW LINE - Store current page

    const currentPath = window.location.pathname;
    const communityMatch = currentPath.match(/\/communities\/([^\/]+)/);
    const community = communityMatch ? communityMatch[1] : "boca-bridges";
    navigate(`/signin?community=${community}`);
    onOpenChange(false);
  };

  const getContextMessage = () => {
    switch (context) {
      case "rate":
        return `Join ${communityName} to rate vendors and share your experience`;
      case "reviews":
        return `Join ${communityName} to see full neighbor reviews`;
      case "costs":
        return `Join ${communityName} to view and share cost information`;
      default:
        return `Join ${communityName} to rate vendors, see reviews, and view costs`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">Welcome to {communityName}</DialogTitle>
          <DialogDescription className="text-center pt-2">{getContextMessage()}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <GoogleSignInButton
            onClick={handleGoogleAuth}
            loading={loading}
            label="Continue with Google"
            community={communityName}
          />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={handleEmailSignUp} disabled={loading}>
            Sign Up with Email
          </Button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={handleSignIn}
              className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
              disabled={loading}
            >
              Already a member? Log in here
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
