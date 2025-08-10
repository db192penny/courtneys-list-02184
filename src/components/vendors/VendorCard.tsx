
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";

type Vendor = {
  id: string;
  name: string;
  category: string;
  contact_info: string | null;
  typical_cost: number | null;
  community: string | null;
};

export default function VendorCard({
  vendor,
  isVerified,
}: {
  vendor: Vendor;
  isVerified: boolean;
}) {
  const masked = isVerified ? vendor.contact_info : "Hidden until verified";
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{vendor.name}</CardTitle>
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
        <div className="pt-2">
          <Link to={`/vendor/${vendor.id}`} className="underline">
            View details
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
