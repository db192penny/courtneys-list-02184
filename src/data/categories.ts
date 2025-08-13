export const CATEGORIES = [
  "Pool",
  "Landscaping", 
  "HVAC",
  "Plumbing",
  "Electrical",
  "Roofing",
  "General Contractor",
  "Pest Control",
  "Handyman",
  "Power Washing",
] as const;

export type Category = (typeof CATEGORIES)[number];
