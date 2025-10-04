import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

type AccessGateModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: 'reviews' | 'costs' | 'rate';
  communityName: string;
  vendorName?: string;
};

const getContent = (type: 'reviews' | 'costs' | 'rate', communityName: string) => {
  switch (type) {
    case 'reviews':
      return {
        title: communityName,
        subtitle: "Full Reviews",
        message: "Full neighbor reviews are shared just within our neighborhood circle.",
        cta: "Sign in or request access to view them."
      };
    case 'costs':
      return {
        title: communityName,
        subtitle: "Cost Details",
        message: "Full cost details are shared just within our neighborhood circle.",
        cta: "Sign in or request access to view them."
      };
    case 'rate':
      return {
        title: communityName,
        subtitle: "Rate This Vendor",
        message: "Sign in or request access for the rating fun! One step away from helping your neighbors!",
        cta: ""
      };
  }
};

export function AccessGateModal({ 
  open, 
  onOpenChange, 
  contentType, 
  communityName,
}: AccessGateModalProps) {
  const navigate = useNavigate();
  const content = getContent(contentType, communityName);
  
  const handleSignIn = () => {
    onOpenChange(false);
    navigate('/signin');
  };
  
  const handleRequestAccess = () => {
    onOpenChange(false);
    const communitySlug = communityName.toLowerCase().replace(/\s+/g, '-');
    navigate(`/auth?community=${communitySlug}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-center">
            {content.title}
          </DialogTitle>
          <p className="text-sm text-muted-foreground text-center pt-1">
            {content.subtitle}
          </p>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-foreground">
              {content.message}
            </p>
            {content.cta && (
              <p className="text-sm font-medium text-foreground">
                {content.cta}
              </p>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={handleSignIn}
              className="flex-1"
            >
              Sign In
            </Button>
            <Button 
              variant="cta" 
              onClick={handleRequestAccess}
              className="flex-1"
            >
              Request Access
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
