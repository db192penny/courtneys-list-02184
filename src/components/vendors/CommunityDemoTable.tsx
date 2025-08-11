import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

type SampleVendor = {
  name: string;
  category: string;
  rating: number; // 0-5
  reviews: number;
  typical_cost: number; // USD
  contact: string;
};

const SAMPLE_VENDORS: SampleVendor[] = [
  { name: "BrightNest Electric", category: "Electrician", rating: 4.8, reviews: 37, typical_cost: 425, contact: "Hidden — sign up to unlock" },
  { name: "EverGreen Lawn Co.", category: "Landscaping", rating: 4.6, reviews: 52, typical_cost: 95, contact: "Hidden — sign up to unlock" },
  { name: "BlueSky Roofing", category: "Roofing", rating: 4.7, reviews: 28, typical_cost: 1450, contact: "Hidden — sign up to unlock" },
  { name: "Sparkle & Shine", category: "House Cleaning", rating: 4.5, reviews: 61, typical_cost: 140, contact: "Hidden — sign up to unlock" },
  { name: "ClearFlow Plumbing", category: "Plumber", rating: 4.9, reviews: 44, typical_cost: 310, contact: "Hidden — sign up to unlock" },
  { name: "Peak HVAC", category: "HVAC", rating: 4.4, reviews: 35, typical_cost: 385, contact: "Hidden — sign up to unlock" },
  { name: "Sunrise Painting", category: "Painter", rating: 4.7, reviews: 23, typical_cost: 1200, contact: "Hidden — sign up to unlock" },
  { name: "SafeHome Pest", category: "Pest Control", rating: 4.6, reviews: 31, typical_cost: 85, contact: "Hidden — sign up to unlock" },
];

function Stars({ value }: { value: number }) {
  const rounded = Math.round(value);
  return (
    <div className="flex items-center" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={i < rounded ? "text-primary" : "text-muted-foreground"}
          size={16}
          strokeWidth={2}
          {...(i < rounded ? { fill: "currentColor" } : { fill: "none" })}
        />
      ))}
      <span className="ml-2 text-xs text-muted-foreground">{value.toFixed(1)}</span>
    </div>
  );
}

export default function CommunityDemoTable({
  communityName,
  onSignUp,
  onSubmitVendor,
}: {
  communityName: string;
  onSignUp?: () => void;
  onSubmitVendor?: () => void;
}) {
  const currency = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  return (
    <section aria-label="Sample community providers" className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Preview of {communityName} providers</h2>
        <p className="text-sm text-muted-foreground">
          This example table shows how real, neighbor-recommended providers will appear — with ratings, reviews, and typical costs.
        </p>
      </header>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Provider</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Avg rating</TableHead>
            <TableHead>Reviews</TableHead>
            <TableHead>Typical cost</TableHead>
            <TableHead>Contact</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {SAMPLE_VENDORS.map((v) => (
            <TableRow key={`${v.name}-${v.category}`}>
              <TableCell className="font-medium text-foreground">{v.name}</TableCell>
              <TableCell>
                <Badge variant="secondary">{v.category}</Badge>
              </TableCell>
              <TableCell>
                <Stars value={v.rating} />
              </TableCell>
              <TableCell className="tabular-nums">{v.reviews.toLocaleString()}</TableCell>
              <TableCell className="tabular-nums">{currency.format(v.typical_cost)}</TableCell>
              <TableCell className="text-muted-foreground">{v.contact}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableCaption>Example data — actual vendor info is community-sourced.</TableCaption>
      </Table>

      {(onSignUp || onSubmitVendor) && (
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {onSignUp && (
            <Button onClick={onSignUp}>Sign up to unlock community data</Button>
          )}
          {onSubmitVendor && (
            <Button variant="secondary" onClick={onSubmitVendor}>Submit a vendor</Button>
          )}
        </div>
      )}
    </section>
  );
}
