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
  Car, 
  Settings,
  LucideIcon 
} from "lucide-react";
import { Category } from "@/data/categories";

export const categoryIconMap: Record<Category, LucideIcon> = {
  "Pool": Waves,
  "HVAC": Thermometer,
  "Electrical": Zap,
  "Plumbing": Droplets,
  "Landscaping": Trees,
  "Pest Control": Bug,
  "Power Washing": ShowerHead,
  "Handyman": Hammer,
  "Pet Grooming": Heart,
  "House Cleaning": Sparkles,
  "Mobile Tire Repair": Car,
  "Appliance Repair": Settings,
};

export function getCategoryIcon(category: Category): LucideIcon {
  return categoryIconMap[category] || Settings;
}