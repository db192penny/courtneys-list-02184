import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SEO from "@/components/SEO";
import { toast } from "@/hooks/use-toast";
import { toSlug } from "@/utils/slug";
import { Mail, ArrowLeft, Loader2, RefreshCw } from "lucide-react";

const CheckEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isResending, setIsResending] = useState(false);
  
  const email = searchParams.get("email") || "";
  const community = searchParams.get("community");
  const communityName = community ? community.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : null;

  const handleBack = () => {
    const fallbackUrl = community 
      ? `/communities/${toSlug(community)}`
      : "/communities/boca-bridges";
    navigate(fallbackUrl);
  };

  const handleTryDifferentEmail = () => {
    const signInUrl = community ? `/signin?community=${community}` : "/signin";
    navigate(signInUrl);
  };

  const resendMagicLink = async () => {
    if (!email) return;
    
    setIsResending(true);
    console.log("[CheckEmail] Resending magic link for:", email);
    
    try {
      const communitySlug = community ? toSlug(community) : 'boca-bridges';
      const redirectUrl = `${window.location.origin}/communities/${communitySlug}?welcome=true`;
      
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectUrl }
      });
      
      if (signInError) {
        console.error("[CheckEmail] resend signInWithOtp error", signInError);
        toast({ 
          title: "Error sending magic link", 
          description: signInError.message, 
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "Magic link resent!", 
          description: "Please check your inbox (and spam folder)." 
        });
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <main>
      <SEO
        title={`Check Your Email | ${communityName || "Courtney's List"}`}
        description="Check your email for the magic link to access your community."
        canonical={`${window.location.origin}/check-email`}
      />
      <section className="container max-w-lg py-12">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Check your email</CardTitle>
            <CardDescription className="text-base">
              We sent a magic link to{" "}
              <strong className="text-foreground">{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Click the link in your email to sign in instantly.
                <br />
                <strong>Don't forget to check your spam folder!</strong>
              </p>
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={resendMagicLink}
                disabled={isResending}
                variant="outline"
                className="w-full"
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resend magic link
                  </>
                )}
              </Button>
              
              <Button 
                onClick={handleTryDifferentEmail}
                variant="ghost"
                className="w-full"
              >
                Try different email
              </Button>
              
              <Button 
                onClick={handleBack}
                variant="ghost"
                className="w-full text-muted-foreground"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to {communityName || "community"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
};

export default CheckEmail;