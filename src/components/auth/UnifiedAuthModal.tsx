import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { GoogleSignInButton } from "./GoogleSignInButton";

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
  communityName = "",
  context = "rate",
  onSuccess
}: UnifiedAuthModalProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"signup" | "signin">("signup");
  const { toast } = useToast();

  const contextMessages = {
    rate: "rate vendors and share your experience",
    reviews: "see full neighbor reviews",
    costs: "view detailed cost information"
  };

  const handleGoogleAuth = async () => {
    try {
      setLoading(true);
      const redirectUrl = `${window.location.origin}/auth-callback`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('Google auth error:', error);
      toast({
        title: "Authentication failed",
        description: error.message,
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !name) {
      toast({
        title: "Missing information",
        description: "Please enter your name and email",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      // Check if user already exists
      const { data: statusData } = await supabase.rpc("get_email_status", {
        _email: email,
      });

      if (statusData === "approved") {
        // Existing approved user - send magic link
        const redirectUrl = `${window.location.origin}/auth-callback`;
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectUrl,
          },
        });

        if (error) throw error;

        toast({
          title: "Check your email!",
          description: "We've sent you a magic link to sign in.",
        });
        onOpenChange(false);
      } else if (statusData === "pending") {
        toast({
          title: "Account pending approval",
          description: "Your account is awaiting admin approval. You'll receive an email once approved.",
        });
      } else {
        // New user - redirect to full signup
        const signupUrl = `/auth?community=${encodeURIComponent(communityName)}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`;
        window.location.href = signupUrl;
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      const { data: statusData } = await supabase.rpc("get_email_status", {
        _email: email,
      });

      if (statusData === "approved") {
        const redirectUrl = `${window.location.origin}/auth-callback`;
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectUrl,
          },
        });

        if (error) throw error;

        toast({
          title: "Check your email!",
          description: "We've sent you a magic link to sign in.",
        });
        onOpenChange(false);
      } else if (statusData === "pending") {
        toast({
          title: "Account pending approval",
          description: "Your account is awaiting admin approval.",
        });
      } else {
        toast({
          title: "Account not found",
          description: "Please sign up first to join your community.",
          variant: "destructive"
        });
        setActiveTab("signup");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join {communityName || "the community"}</DialogTitle>
          <DialogDescription>
            Sign in or create an account to {contextMessages[context]}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "signup" | "signin")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
            <TabsTrigger value="signin">Sign In</TabsTrigger>
          </TabsList>

          <TabsContent value="signup" className="space-y-4 mt-4">
            <GoogleSignInButton 
              onClick={handleGoogleAuth}
              loading={loading}
              label="Continue with Google"
              community={communityName}
            />

            <form onSubmit={handleEmailSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Name</Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue with Email
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signin" className="space-y-4 mt-4">
            <GoogleSignInButton 
              onClick={handleGoogleAuth}
              loading={loading}
              label="Continue with Google"
              community={communityName}
            />

            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Magic Link
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
