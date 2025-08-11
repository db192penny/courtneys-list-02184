import { useMemo, useState } from "react";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Lock } from "lucide-react";

type SampleVendor = {
  name: string;
  homes_serviced: number;
  hoa_rating: number; // 0-5
  google_rating: number; // 0-5
  typical_cost: number; // USD per month
  contact: string;
};

const SAMPLE_VENDORS: SampleVendor[] = [
  { name: "BrightNest Electric", homes_serviced: 56, hoa_rating: 4.8, google_rating: 4.6, typical_cost: 425, contact: "Hidden — sign up to unlock" },
  { name: "Peak HVAC", homes_serviced: 43, hoa_rating: 4.4, google_rating: 4.5, typical_cost: 385, contact: "Hidden — sign up to unlock" },
  { name: "EverGreen Lawn Co.", homes_serviced: 24, hoa_rating: 4.6, google_rating: 4.5, typical_cost: 95, contact: "Hidden — sign up to unlock" },
];

function Stars({ value }: { value: number }) {
  const filled = Math.floor(value);
  return (
    <div className="flex items-center" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={i < filled ? "text-primary" : "text-muted-foreground"}
          size={16}
          strokeWidth={2}
          {...(i < filled ? { fill: "currentColor" } : { fill: "none" })}
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

  const [category, setCategory] = useState("HVAC");
  const [sort, setSort] = useState<"homes_desc">("homes_desc");

  const sortedData = useMemo(() => {
    const arr = [...SAMPLE_VENDORS];
    // Default and only option for now: number of homes serviced (desc)
    arr.sort((a, b) => b.homes_serviced - a.homes_serviced);
    return arr;
  }, [sort]);

  return (
    <section aria-label="Sample community providers" className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Preview of {communityName} providers</h2>
        <p className="text-sm text-muted-foreground">
          This example shows how real, neighbor-recommended providers will appear — with homes serviced, ratings, and typical costs.
        </p>
      </header>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1 sm:flex-none">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Category</label>
          <Select value={category} onValueChange={setCategory} disabled>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="HVAC">HVAC</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 sm:flex-none">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Sort by</label>
          <Select value={sort} onValueChange={(v) => setSort(v as "homes_desc")}> 
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="homes_desc"># of Homes Serviced (desc)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rank</TableHead>
            <TableHead className="pr-2"># Homes Serviced</TableHead>
            <TableHead className="pl-2">Provider</TableHead>
            <TableHead>Ratings</TableHead>
            <TableHead>Average Cost</TableHead>
            <TableHead>Contact Info</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((v, idx) => (
            <TableRow key={`${v.name}-${idx}`}>
              <TableCell className="tabular-nums font-medium">{idx + 1}</TableCell>
              <TableCell className="tabular-nums pr-2">{v.homes_serviced.toLocaleString()}</TableCell>
              <TableCell className="font-medium text-foreground pl-2">{v.name}</TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">HOA:</span>
                    <Stars value={v.hoa_rating} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Google:</span>
                    <Stars value={v.google_rating} />
                  </div>
                </div>
              </TableCell>
              <TableCell className="tabular-nums">
                <div className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  <span className="blur-sm select-none">{currency.format(v.typical_cost)}</span>
                  <span className="text-muted-foreground">/ month</span>
                </div>
              </TableCell>
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
