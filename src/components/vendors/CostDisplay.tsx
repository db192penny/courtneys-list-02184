import { useState } from "react";
import { Pencil, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { EditMarketPriceModal } from "./EditMarketPriceModal";
import CostsHover from "./CostsHover";
import PreviewCostsHover from "./PreviewCostsHover";

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
  if (!amount) return null;
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
  communityName
}: CostDisplayProps) {
  const { data: isAdmin } = useIsAdmin();
  const [showEditMarket, setShowEditMarket] = useState(false);

  const communityPrice = formatPrice(communityAmount, communityUnit);
  const marketPrice = formatPrice(marketAmount, marketUnit);

  return (
    <TooltipProvider>
      <div className="text-sm space-y-1">
        {/* Community Price Line */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground min-w-[70px]">{communityName || "Community"}:</span>
          <div className="px-2 py-1.5 rounded-md bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-200 hover:border-blue-300 min-h-[28px] flex items-center">
            {communityPrice ? (
              <span className="text-xs font-medium">
                {communitySampleSize && communitySampleSize > 0 ? (
                  <CostsHover vendorId={vendorId}>
                    {communityPrice}
                  </CostsHover>
                ) : (
                  communityPrice
                )}
                {communitySampleSize && (
                  <span className="text-xs text-muted-foreground ml-1">
                    ({communitySampleSize})
                  </span>
                )}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">TBD</span>
            )}
          </div>
        </div>

        {/* Area Average Price Line */}
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1 min-w-[70px]">
            <span className="text-xs text-muted-foreground">Area Average:</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-xs">
                  Average cost for similar services in your area, based on industry pricing data
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="px-2 py-1.5 rounded-md bg-orange-50 hover:bg-orange-100 transition-colors border border-orange-200 hover:border-orange-300 min-h-[28px] flex items-center">
            {marketPrice ? (
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium">{marketPrice}</span>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowEditMarket(true)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">—</span>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowEditMarket(true)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

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