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
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground min-w-[80px]">{communityName || "Community"}:</span>
          {communitySampleSize && communitySampleSize > 0 ? (
            isMobile ? (
              <Dialog>
                <DialogTrigger asChild>
                  <span className="text-sm font-normal underline decoration-dotted underline-offset-4 cursor-pointer">
                    {communityPrice}
                  </span>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Cost Details</DialogTitle>
                  </DialogHeader>
                  <div className="mt-4">
                    {!isVerified ? (
                      <div className="text-sm text-muted-foreground p-4">
                        Costs are shared just within our neighborhood circle. Sign up to view them.
                      </div>
                    ) : (
                      <MobileCostsModal vendorId={vendorId} />
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <CostsHover vendorId={vendorId}>
                <span className="text-sm font-normal underline decoration-dotted underline-offset-4 cursor-pointer">
                  {communityPrice}
                </span>
              </CostsHover>
            )
          ) : (
            <span 
              className="text-sm text-muted-foreground underline decoration-dotted underline-offset-4 cursor-pointer"
              onClick={onOpenCostModal}
            >
              {communityPrice || "Share cost info"}
            </span>
          )}
        </div>

        {/* Area Average Price Line - if enabled */}
        {SHOW_AREA_AVERAGE && marketPrice && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground min-w-[80px]">Area Average:</span>
            <span className="text-sm font-normal underline decoration-dotted underline-offset-4">
              {marketPrice}
            </span>
          </div>
        )}
      </div>

      {/* Edit Market Price Modal */}
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
    </TooltipProvider>
  );
}