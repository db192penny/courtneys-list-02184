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
  Filter,
  PaintBucket,
  Palette,
  Truck,
  LucideIcon 
} from "lucide-react";
import { Category } from "@/data/categories";

export const categoryIconMap: Record<Category, LucideIcon> = {
  "Pool": Waves,
  "HVAC": Thermometer,
  "Electrical": Zap,
  "Plumbing": Droplets,
  "Painters": PaintBucket,
  "Landscaping": Trees,
  "Pest Control": Bug,
  "Power Washing": ShowerHead,
  "Car Wash & Detail": Car,
  "Handyman": Hammer,
  "Pet Grooming": Heart,
  "House Cleaning": Sparkles,
  "Mobile Tire Repair": Car,
  "Appliance Repair": Settings,
  "Water Filtration": Filter,
  "Interior Design": Palette,
  "Moving Company": Truck,
};

export function getCategoryIcon(category: Category): LucideIcon {
  return categoryIconMap[category] || Settings;
}