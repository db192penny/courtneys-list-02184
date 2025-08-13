import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type CostEntry = {
  cost_kind: "monthly_plan" | "yearly_plan" | "service_call" | "hourly";
  amount: number | null;
  period?: string | null; // e.g., monthly, yearly
  unit?: string | null;   // e.g., month, year, visit, hour
  quantity?: number | null; // e.g., visits per month/year
};

export function buildDefaultCosts(category?: string): CostEntry[] {
  const c = (category || "").toLowerCase();
  
  // Pool/Landscaping/Pest Control: Maintenance Plan with visits
  if (c === "pool" || c === "pool service" || c === "landscaping" || c === "pest control") {
    return [
      { cost_kind: "monthly_plan", amount: null, period: "monthly", unit: "month", quantity: null },
    ];
  }
  
  // HVAC: Service Call + Yearly Maintenance Plan
  if (c === "hvac") {
    return [
      { cost_kind: "service_call", amount: null, unit: "visit" },
      { cost_kind: "yearly_plan", amount: null, period: "yearly", unit: "year", quantity: null },
    ];
  }
  
  // Plumbing/Electrical: Service Call only
  if (c === "plumbing" || c === "electrical") {
    return [
      { cost_kind: "service_call", amount: null, unit: "visit" },
    ];
  }
  
  // Handyman: Hourly Rate
  if (c === "handyman") {
    return [
      { cost_kind: "hourly", amount: null, unit: "hour" },
    ];
  }
  
  // Roofing/General Contractor: No structured fields
  if (c === "roofing" || c === "general contractor") {
    return [];
  }
  
  // Default: monthly plan
  return [
    { cost_kind: "monthly_plan", amount: null, period: "monthly", unit: "month" },
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
        "Maintenance Plan";

      const unitDisplay = 
        entry.cost_kind === "service_call" ? " per Visit" :
        entry.cost_kind === "hourly" ? " per Hour" :
        entry.cost_kind === "yearly_plan" ? " per Year" :
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
          {/* Show visits quantity for Pool/Landscaping/Pest Control monthly plans and HVAC yearly plans */}
          {((entry.cost_kind === "monthly_plan" && (c === "pool" || c === "pool service" || c === "landscaping" || c === "pest control")) ||
            (entry.cost_kind === "yearly_plan" && c === "hvac")) && (
            <div className="grid gap-2">
              <Label># of Visits: {entry.cost_kind === "monthly_plan" ? "visits per Month" : "visits per Year"}</Label>
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
      {/* Always show guidance text */}
      <div className="text-xs text-muted-foreground mt-2">
        Please provide any additional cost guidance/experience in Comments below
      </div>
    </div>
  );
}
