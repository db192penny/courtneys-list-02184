import { useState } from "react";
import { Pencil, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useNavigate } from "react-router-dom";
import { EditMarketPriceModal } from "./EditMarketPriceModal";
import CostsHover from "./CostsHover";
import { MobileCostsModal } from "./MobileCostsModal";

// Feature flag to control Area Average visibility (set to true to restore later)
const SHOW_AREA_AVERAGE = false;

type CostDisplayProps = {
  vendorId: string;
  vendorName: string;
  category: string;
  communityAmount?: number;
  communityUnit?: string;
  communitySampleSize?: number;
  marketAmount?: number;
  marketUnit?: string;
  showContact: boolean;
  isAuthenticated?: boolean;
  communityName?: string;
  onOpenCostModal?: () => void;
};

const formatUnit = (unit?: string) => {
  if (!unit) return "";
  switch (unit) {
    case "month": return "/mo";
    case "visit": return "/visit";
    case "hour": return "/hour";
    case "job": return "";
    default: return `/${unit}`;
  }
};

const formatPrice = (amount?: number, unit?: string) => {
  if (amount === undefined || amount === null || amount === 0) {
    return null;
  }
  const formatted = amount % 1 === 0 ? `$${amount}` : `$${amount.toFixed(2)}`;
  return `${formatted}${formatUnit(unit)}`;
};

export function CostDisplay({
  vendorId,
  vendorName,
  category,
  communityAmount,
  communityUnit,
  communitySampleSize,
  marketAmount,
  marketUnit,
  showContact,
  isAuthenticated,
  communityName,
  onOpenCostModal
}: CostDisplayProps) {
  const { data: isAdmin } = useIsAdmin();
  const { data: profile } = useUserProfile();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [showEditMarket, setShowEditMarket] = useState(false);
  
  const isVerified = !!profile?.isVerified;

  const communityPrice = formatPrice(communityAmount, communityUnit);
  const marketPrice = formatPrice(marketAmount, marketUnit);

  return (
    <TooltipProvider>
      <div className="text-sm space-y-1">
        {/* Community Price Line */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground min-w-[70px]">{communityName || "Community"}:</span>
          {communitySampleSize && communitySampleSize > 0 ? (
            isMobile ? (
              <Dialog>
                <DialogTrigger asChild>
                  <span className="text-xs font-normal underline decoration-dotted underline-offset-4 cursor-pointer">
                    {communityPrice}
                  </span>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Cost Details</DialogTitle>
                  </DialogHeader>
                  <div className="mt-4">
                    {!isVerified ? (
                      <div className="space-y-4 p-4">
                        <div className="text-sm text-muted-foreground">
                          Costs are shared just within our neighborhood circle. Sign up to view them.
                        </div>
                        <Button 
                          onClick={() => navigate('/auth/signup')}
                          className="w-full"
                        >
                          Sign Up to View Costs
                        </Button>
                      </div>
                    ) : (
                      <MobileCostsModal vendorId={vendorId} />
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <CostsHover vendorId={vendorId}>
                <span className="text-xs font-normal underline decoration-dotted underline-offset-4 cursor-pointer">
                  {communityPrice}
                </span>
              </CostsHover>
            )
          ) : (
            <span 
              className={`text-xs underline decoration-dotted underline-offset-4 cursor-pointer ${communityPrice ? 'font-normal' : 'text-muted-foreground'}`}
              onClick={onOpenCostModal}
            >
              {communityPrice || "Share cost info"}
            </span>
          )}
        </div>

        {/* Area Average Price Line */}
        {SHOW_AREA_AVERAGE && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground min-w-[70px]">Area Average:</span>
            {isMobile ? (
              <Dialog>
                <DialogTrigger asChild>
                  <span className="text-xs font-normal underline decoration-dotted underline-offset-4 cursor-pointer">
                    {marketPrice || "No data"}
                  </span>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Area Average Calculation</DialogTitle>
                  </DialogHeader>
                  <div className="mt-4 space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Average cost for similar services in your area, based on industry pricing data, home prices, and data from HomeAdvisor.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs font-normal underline decoration-dotted underline-offset-4 cursor-pointer">
                    {marketPrice || "No data"}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm">
                    Average cost for similar services in your area, based on industry pricing data, home prices, and data from HomeAdvisor.
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}

        {/* Modals */}
        {showEditMarket && (
          <EditMarketPriceModal
            open={showEditMarket}
            onOpenChange={setShowEditMarket}
            vendorId={vendorId}
            vendorName={vendorName}
            currentAmount={marketAmount}
            currentUnit={marketUnit}
          />
        )}
      </div>
    </TooltipProvider>
  );
}