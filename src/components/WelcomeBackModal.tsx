import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WelcomeBackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  communityName?: string;
}

export function WelcomeBackModal({ open, onOpenChange, email, communityName }: WelcomeBackModalProps) {
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();

  const resendMagicLink = async () => {
    if (!email) return;

    setIsResending(true);
    console.log("[WelcomeBackModal] Resending magic link for:", email);

    try {
      const redirectUrl = `${window.location.origin}/auth`;
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectUrl }
      });

      if (signInError) {
        console.error("[WelcomeBackModal] resend signInWithOtp error", signInError);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-xl">Welcome back!</DialogTitle>
          <DialogDescription className="text-base">
            You're already a member. We just sent you a magic link to{" "}
            <strong className="text-foreground">{email}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Check your inbox (and spam folder) for your magic link.
              <br />
              Click the link to sign in instantly!
            </p>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Got it!
            </Button>
            
            <Button 
              variant="outline" 
              onClick={resendMagicLink}
              disabled={isResending}
              className="w-full"
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resending...
                </>
              ) : (
                <>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Resend Magic Link
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}