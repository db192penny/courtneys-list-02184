import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { AddCostModal } from "./AddCostModal";
import { EditMarketPriceModal } from "./EditMarketPriceModal";

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
  showContact
}: CostDisplayProps) {
  const { data: isAdmin } = useIsAdmin();
  const [showAddCost, setShowAddCost] = useState(false);
  const [showEditMarket, setShowEditMarket] = useState(false);

  const communityPrice = formatPrice(communityAmount, communityUnit);
  const marketPrice = formatPrice(marketAmount, marketUnit);

  // Hide cost inputs for roofing/GC categories
  const showCostInput = !["roofing", "general contractor"].some(cat => 
    category.toLowerCase().includes(cat)
  );

  return (
    <div className="text-sm space-y-1">
      {/* Community Price Line */}
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">Community:</span>
        {communityPrice ? (
          <span className="font-medium">
            {communityPrice}
            {communitySampleSize && (
              <span className="text-xs text-muted-foreground ml-1">
                ({communitySampleSize})
              </span>
            )}
          </span>
        ) : (
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">TBD</span>
            {showCostInput && showContact && (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs text-primary"
                onClick={() => setShowAddCost(true)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add cost
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Market Price Line */}
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">Market:</span>
        {marketPrice ? (
          <div className="flex items-center gap-1">
            <span className="font-medium">{marketPrice}</span>
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
            <span className="text-muted-foreground">—</span>
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

      {/* Modals */}
      {showAddCost && (
        <AddCostModal
          open={showAddCost}
          onOpenChange={setShowAddCost}
          vendorId={vendorId}
          vendorName={vendorName}
          category={category}
        />
      )}

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
  );
}