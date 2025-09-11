import { 
  Waves, 
  Thermometer, 
  Zap, 
  Droplets, 
  Trees, 
  Bug, 
  ShowerHead, 
  Hammer, 
  Heart, 
  Sparkles, 
  CarFront, 
  Settings,
  Droplet,
  Brush,
  Sofa,
  LucideIcon 
} from "lucide-react";
import { Category } from "@/data/categories";

// Category icon mapping for vendors
export const categoryIconMap: Record<Category, LucideIcon> = {
  "Pool": Waves,
  "HVAC": Thermometer,
  "Electrical": Zap,
  "Plumbing": Droplets,
  "Painters": Brush,
  "Landscaping": Trees,
  "Pest Control": Bug,
  "Power Washing": ShowerHead,
  "Car Wash & Detail": CarFront,
  "Handyman": Hammer,
  "Pet Grooming": Heart,
  "House Cleaning": Sparkles,
  "Mobile Tire Repair": CarFront,
  "Appliance Repair": Settings,
  "Water Filtration": Droplet,
  "Interior Design": Sofa,
};

export function getCategoryIcon(category: Category): LucideIcon {
  return categoryIconMap[category] || Settings;
}