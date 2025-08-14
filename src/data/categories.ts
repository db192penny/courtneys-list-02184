export const CATEGORIES = [
  "Pool",
  "HVAC",
  "Landscaping", 
  "Pest Control",
  "Electrical",
  "Plumbing",
  "Power Washing",
  "Handyman",
  "General Contractor",
  "Roofing",
] as const;

export type Category = (typeof CATEGORIES)[number];
