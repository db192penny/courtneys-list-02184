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
        message: `Join ${communityName} to see full neighbor reviews`
      };
    case 'costs':
      return {
        title: communityName,
        subtitle: "Cost Details",
        message: "Find out who got the deal and who got... the other thing"
      };
    case 'rate':
      return {
        title: communityName,
        subtitle: "Rate This Vendor",
        message: `Rating fun will be a click away once you join ${communityName}`
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
          <div className="text-center">
            <p className="text-base text-foreground leading-relaxed">
              {content.message}
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={handleSignIn}
              className="flex-1"
            >
              Log In
            </Button>
            <Button 
              variant="cta" 
              onClick={handleRequestAccess}
              className="flex-1"
            >
              Sign Up
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
