import { Category } from "@/data/categories";

// This is the single source of truth for all category emojis across the site
// When adding a new category, update this mapping
export const categoryEmojiMap: Record<string, string> = {
  'all': '🏠',
  'HVAC': '🔧',
  'Pool': '🏊',
  'Landscaping': '🌱',
  'Landscape Lighting': '💡',
  'Plumbing': '🚰',
  'Electrician': '⚡',
  'Generator': '⚡',
  'Pest Control': '🐛',
  'House Cleaning': '🧹',
  'Handyman': '🔨',
  'Roofing': '🏠',
  'General Contractor': '👷',
  'Car Service': '🚗',
  'Car Wash and Detail': '🚗',
  'Car Wash & Detail': '🚗',
  'Pet Grooming': '🐕',
  'Mobile Tire Repair': '🔧',
  'Appliance Repair': '🔌',
  'Auto Transport': '🚛',
  'Bartenders': '🍸',
  'Painters': '🖌️',
  'Grill Cleaning': '🔥',
  'House Manager': '🏢',
  'Power Washing': '🚿',
  'Water Filtration': '💧',
  'Interior Design': '🛋️',
  'Moving Company': '🚚',
  'Damage Assessment/Restoration': '🛠️',
  'Carpet/Upholstery Cleaning': '🧽',
  'Patio Screening': '🏠',
  'Holiday Lighting': '✨',
  'Tile Installation': '🟫',
  'Turf Installation': '🌿',
  'Wallpaper Installation': '📜',
  'Window Treatment': '🪟'
};

export function getCategoryEmoji(category: string): string {
  return categoryEmojiMap[category] || '🏠';
}