import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SEO from "@/components/SEO";
import { toast } from "@/hooks/use-toast";
import { Loader2, Mail } from "lucide-react";

const QuickAccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  const email = searchParams.get("email") || "";

  const handleSendAccess = async () => {
    if (!email) {
      toast({
        title: "Email required",
        description: "Please provide an email address in the URL parameters.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/communities/boca-bridges?welcome=true`
        }
      });

      if (error) {
        console.error("[QuickAccess] signInWithOtp error:", error);
        toast({
          title: "Error sending access link",
          description: error.message,
          variant: "destructive"
        });
      } else {
        navigate(`/check-email?email=${encodeURIComponent(email)}`);
      }
    } catch (error) {
      console.error("[QuickAccess] Unexpected error:", error);
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main>
      <SEO
        title="Quick Access | Courtney's List"
        description="Get instant access to your community with a magic link."
        canonical={`${window.location.origin}/quick-access`}
      />
      <section className="container max-w-md py-12">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Welcome back!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-muted"
              />
            </div>
            
            <Button 
              onClick={handleSendAccess}
              disabled={isLoading || !email}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send me instant access"
              )}
            </Button>
            
            <p className="text-center text-sm text-muted-foreground">
              We'll send a magic link to sign you in
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
};

export default QuickAccess;