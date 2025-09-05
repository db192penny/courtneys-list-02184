export const CATEGORIES = [
  "Pool",
  "HVAC",
  "Landscaping", 
  "Pest Control",
  "Electrical",
  "Plumbing",
  "Power Washing",
  "Car Wash & Detail",
  "Handyman",
  "Pet Grooming",
  "House Cleaning",
  "Mobile Tire Repair",
  "Appliance Repair",
] as const;

export type Category = (typeof CATEGORIES)[number];
