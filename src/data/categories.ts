export const CATEGORIES = [
  "Pool",
  "HVAC",
  "Landscaping", 
  "Pest Control",
  "Electrical",
  "Plumbing",
  "Painters",
  "Power Washing",
  "Car Wash & Detail",
  "Handyman",
  "Pet Grooming",
  "House Cleaning",
  "Mobile Tire Repair",
  "Appliance Repair",
  "Water Filtration",
] as const;

export type Category = (typeof CATEGORIES)[number];
