import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import useIsAdmin from "@/hooks/useIsAdmin";
import useIsHoaAdmin from "@/hooks/useIsHoaAdmin";

type Vendor = {
  id: string;
  name: string;
  category: string;
  contact_info: string | null;
  typical_cost: number | null;
  community: string | null;
  homes_serviced?: number;
};

export default function VendorCard({
  vendor,
  isVerified,
}: {
  vendor: Vendor;
  isVerified: boolean;
}) {
  const masked = isVerified ? vendor.contact_info : "Hidden until verified";
  const { data: isAdmin } = useIsAdmin();
  const { data: isHoaAdmin } = useIsHoaAdmin();
  const canEdit = !!isAdmin || !!isHoaAdmin;
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            {/* Labels above provider name */}
            <div className="flex flex-wrap gap-1">
              {vendor.homes_serviced === 0 && (
                <Badge 
                  variant="secondary" 
                  className="text-xs px-2 py-0.5 bg-orange-100 text-orange-800 hover:bg-orange-200"
                >
                  New
                </Badge>
              )}
            </div>
            {/* Full provider name */}
            <CardTitle className="text-base break-words leading-tight">{vendor.name}</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">{vendor.category}</span>
        </div>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-2">
        <div>
          <span className="font-medium text-foreground">Contact:</span>{" "}
          <span>{masked || "N/A"}</span>
        </div>
        {vendor.typical_cost !== null && (
          <div>
            <span className="font-medium text-foreground">Typical Cost:</span>{" "}
            <span>${Number(vendor.typical_cost).toLocaleString()}</span>
          </div>
        )}
        {vendor.community && (
          <div>
            <span className="font-medium text-foreground">Community:</span>{" "}
            <span>{vendor.community}</span>
          </div>
        )}
{canEdit && (
          <div className="pt-2 flex items-center gap-3">
            <Button asChild size="sm" variant="secondary">
              <Link to={`/submit?vendor_id=${vendor.id}`}>Edit</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
