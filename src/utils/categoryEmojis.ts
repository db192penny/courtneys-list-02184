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
  'Electrical': '⚡',
  'Generator': '⚡',
  'Pest Control': '🐛',
  'House Cleaning': '🧹',
  'Handyman': '🔨',
  'Roofing': '🏠',
  'General Contractor': '👷',
  'Car Wash and Detail': '🚗',
  'Car Wash & Detail': '🚗',
  'Pet Grooming': '🐕',
  'Mobile Tire Repair': '🔧',
  'Appliance Repair': '🔌',
  'Painters': '🖌️',
  'Grill Cleaning': '🔥',
  'House Manager': '🏢',
  'Power Washing': '🚿',
  'Water Filtration': '💧',
  'Interior Design': '🛋️',
  'Moving Company': '🚚',
  'Damage Assessment/Restoration': '🛠️',
  'Carpet & Sofa Cleaning': '🧽',
  'Patio Screening': '🏠',
  'Holiday Lighting': '✨',
  'Tile Installation': '🟫'
};

export function getCategoryEmoji(category: string): string {
  return categoryEmojiMap[category] || '🏠';
}