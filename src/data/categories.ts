export const CATEGORIES = [
  "Appliance Repair",
  "Car Wash & Detail",
  "Damage Assessment/Restoration",
  "Electrical",
  "Handyman",
  "House Cleaning",
  "House Manager",
  "HVAC",
  "Interior Design",
  "Landscaping",
  "Mobile Tire Repair",
  "Moving Company",
  "Painters",
  "Pest Control",
  "Pet Grooming",
  "Plumbing",
  "Pool",
  "Power Washing",
  "Water Filtration",
] as const;

export type Category = (typeof CATEGORIES)[number];
