import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type CostEntry = {
  cost_kind: "monthly_plan" | "service_call" | "hourly";
  amount: number | null;
  period?: string | null; // e.g., monthly
  unit?: string | null;   // e.g., month, call, hour, visit
  quantity?: number | null; // e.g., visits per month
};

export function buildDefaultCosts(category?: string): CostEntry[] {
  const c = (category || "").toLowerCase();
  if (c === "hvac") {
    return [
      { cost_kind: "service_call", amount: null, unit: "call" },
      { cost_kind: "monthly_plan", amount: null, period: "monthly", unit: "month" },
    ];
  }
  if (c === "pool" || c === "pool service") {
    return [
      { cost_kind: "monthly_plan", amount: null, period: "monthly", unit: "month", quantity: null }, // visits/mo in quantity
    ];
  }
  if (c === "handyman") {
    return [
      { cost_kind: "hourly", amount: null, unit: "hour" },
    ];
  }
  // Default: allow monthly plan optional
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

  const sections = useMemo(() => entries.map((entry, idx) => {
    const label =
      entry.cost_kind === "service_call" ? "Cost per service call" :
      entry.cost_kind === "hourly" ? "Hourly rate" :
      "Monthly cost";

    return (
      <div key={`${entry.cost_kind}-${idx}`} className="grid gap-2">
        <Label>{label}</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="decimal"
            placeholder="e.g., 150"
            value={entry.amount ?? ""}
            onChange={(e) => onField(idx, { amount: e.currentTarget.value === "" ? null : Number(e.currentTarget.value) })}
          />
          <span className="text-sm text-muted-foreground">USD{entry.cost_kind === "monthly_plan" ? "/mo" : entry.cost_kind === "hourly" ? "/hr" : ""}</span>
        </div>
        {entry.cost_kind === "monthly_plan" && (category || "").toLowerCase().includes("pool") && (
          <div className="grid gap-2">
            <Label>Visits per month (optional)</Label>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="e.g., 4"
              value={entry.quantity ?? ""}
              onChange={(e) => onField(idx, { quantity: e.currentTarget.value === "" ? null : Number(e.currentTarget.value), unit: "visit" })}
            />
          </div>
        )}
      </div>
    );
  }), [entries, category]);

  return (
    <div className="grid gap-4">
      {sections}
    </div>
  );
}
