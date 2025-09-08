import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type CostEntry = {
  cost_kind: "monthly_plan" | "yearly_plan" | "service_call" | "hourly" | "one_time";
  amount: number | null;
  period?: string | null; // e.g., monthly, yearly
  unit?: string | null;   // e.g., month, year, visit, hour
  quantity?: number | null; // e.g., visits per month/year
  notes?: string | null;  // additional details/comments
};

export function buildDefaultCosts(category?: string): CostEntry[] {
  const c = (category || "").toLowerCase();
  
  // Pool/Landscaping/Pest Control: Maintenance Plan with visits
  if (c === "pool" || c === "pool service" || c === "landscaping" || c === "pest control") {
    return [
      { cost_kind: "monthly_plan", amount: null, period: "monthly", unit: "month", quantity: null, notes: null },
    ];
  }
  
  // HVAC: Service Call + Yearly Maintenance Plan
  if (c === "hvac") {
    return [
      { cost_kind: "service_call", amount: null, unit: "visit", notes: null },
      { cost_kind: "yearly_plan", amount: null, period: "yearly", unit: "year", quantity: null, notes: null },
    ];
  }
  
  // Plumbing/Electrical/Pet Grooming/House Cleaning/Mobile Tire Repair/Appliance Repair: Service Call only
  if (c === "plumbing" || c === "electrical" || c === "pet grooming" || c === "house cleaning" || c === "mobile tire repair" || c === "appliance repair") {
    return [
      { cost_kind: "service_call", amount: null, unit: "visit", notes: null },
    ];
  }
  
  // Handyman: Hourly Rate
  if (c === "handyman") {
    return [
      { cost_kind: "hourly", amount: null, unit: "hour", notes: null },
    ];
  }
  
  // Power Washing/Car Wash & Detail: Per visit with yearly quantity
  if (c === "power washing" || c === "car wash & detail") {
    return [
      { cost_kind: "service_call", amount: null, unit: "visit", quantity: null, notes: null },
    ];
  }
  
  // Water Filtration: Installation cost + optional yearly maintenance
  if (c === "water filtration") {
    return [
      { cost_kind: "one_time", amount: null, unit: "installation", notes: null },
      { cost_kind: "yearly_plan", amount: null, period: "yearly", unit: "year", notes: null },
    ];
  }
  
  // Roofing/General Contractor: No structured fields
  if (c === "roofing" || c === "general contractor") {
    return [];
  }
  
  // Default: monthly plan
  return [
    { cost_kind: "monthly_plan", amount: null, period: "monthly", unit: "month", notes: null },
  ];
}

export default function CostInputs({
  category,
  value,
  onChange,
}: {
  category?: string;
  value?: CostEntry[];
  onChange: (entries: CostEntry[]) => void;
}) {
  const [entries, setEntries] = useState<CostEntry[]>(() => value && value.length ? value : buildDefaultCosts(category));

  useEffect(() => {
    // Reset when category changes if there are no values filled
    const hasValues = entries.some((e) => e.amount != null || e.quantity != null);
    if (!hasValues) {
      const def = buildDefaultCosts(category);
      setEntries(def);
      onChange(def);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  useEffect(() => {
    if (value) setEntries(value);
  }, [value?.map((v) => `${v.cost_kind}:${v.amount}:${v.quantity}`).join("|")]);

  const onField = (idx: number, patch: Partial<CostEntry>) => {
    setEntries((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch } as CostEntry;
      onChange(next);
      return next;
    });
  };

  const sections = useMemo(() => {
    const c = (category || "").toLowerCase();
    
    // Show no cost fields for roofing/general contractor
    if (c === "roofing" || c === "general contractor") {
      return [
        <div key="no-costs" className="text-sm text-muted-foreground">
          Please provide any additional cost guidance/experience in Comments below
        </div>
      ];
    }
    
    return entries.map((entry, idx) => {
      const label =
        entry.cost_kind === "service_call" ? "Service Call" :
        entry.cost_kind === "hourly" ? "Hourly Rate" :
        entry.cost_kind === "yearly_plan" ? "Maintenance Plan" :
        entry.cost_kind === "one_time" ? "Installation Cost" :
        "Maintenance Plan";

      const unitDisplay = 
        entry.cost_kind === "service_call" ? " per Visit" :
        entry.cost_kind === "hourly" ? " per Hour" :
        entry.cost_kind === "yearly_plan" ? " per Year" :
        entry.cost_kind === "one_time" ? " (one-time)" :
        " per Month";

      return (
        <div key={`${entry.cost_kind}-${idx}`} className="grid gap-2">
          <Label>{label}</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">$</span>
            <Input
              type="number"
              inputMode="decimal"
              placeholder="e.g., 150"
              value={entry.amount ?? ""}
              onChange={(e) => onField(idx, { amount: e.currentTarget.value === "" ? null : Number(e.currentTarget.value) })}
            />
            <span className="text-sm text-muted-foreground">{unitDisplay}</span>
          </div>
          {/* Show visits quantity for Pool/Landscaping/Pest Control monthly plans, HVAC yearly plans, and Power Washing/Car Wash & Detail */}
          {((entry.cost_kind === "monthly_plan" && (c === "pool" || c === "pool service" || c === "landscaping" || c === "pest control")) ||
            (entry.cost_kind === "yearly_plan" && c === "hvac") ||
            (entry.cost_kind === "service_call" && (c === "power washing" || c === "car wash & detail"))) && (
            <div className="grid gap-2">
              <Label># of Visits: {entry.cost_kind === "monthly_plan" ? "visits per Month" : entry.cost_kind === "service_call" && (c === "power washing" || c === "car wash & detail") ? "visits per Year" : "visits per Year"}</Label>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="e.g., 4"
                value={entry.quantity ?? ""}
                onChange={(e) => onField(idx, { quantity: e.currentTarget.value === "" ? null : Number(e.currentTarget.value) })}
              />
            </div>
          )}
        </div>
      );
    });
  }, [entries, category]);

  return (
    <div className="grid gap-4">
      {sections}
      {/* Comments field for all categories */}
      {(category && category.toLowerCase() !== "roofing" && category.toLowerCase() !== "general contractor") && (
        <div className="grid gap-2">
          <Label>Comments (Optional)</Label>
          <Textarea
            placeholder="Share additional details about pricing for neighbors..."
            value={entries[0]?.notes ?? ""}
            onChange={(e) => {
              // Update all entries with the same notes
              setEntries((prev) => {
                const next = prev.map(entry => ({ ...entry, notes: e.target.value || null }));
                onChange(next);
                return next;
              });
            }}
          />
        </div>
      )}
    </div>
  );
}
