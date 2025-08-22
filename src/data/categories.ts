export const CATEGORIES = [
  "Pool",
  "HVAC",
  "Landscaping", 
  "Pest Control",
  "Electrical",
  "Plumbing",
  "Power Washing",
  "Handyman",
  "Pet Grooming",
  "House Cleaning",
] as const;

export type Category = (typeof CATEGORIES)[number];
