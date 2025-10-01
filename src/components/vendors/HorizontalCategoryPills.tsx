import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCategoryEmoji } from "@/utils/categoryEmojis";

interface HorizontalCategoryPillsProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  categories: string[];
}

export const HorizontalCategoryPills: React.FC<HorizontalCategoryPillsProps> = ({
  selectedCategory,
  onCategoryChange,
  categories
}) => {
  // Create sorted categories with "all" first
  const sortedCategories = [
    "all",
    ...categories.sort()
  ];

  const getDisplayValue = () => {
    if (selectedCategory === "all") {
      return `${getCategoryEmoji("all")} All Categories`;
    }
    return `${getCategoryEmoji(selectedCategory)} ${selectedCategory}`;
  };

  return (
    <div>
      <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2 block">
        Choose Category
      </label>
      
      <Select value={selectedCategory} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-full h-12 text-left">
          <SelectValue>
            <span className="flex items-center gap-2">
              {getDisplayValue()}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent 
          data-category-select="true"
          style={{ maxHeight: 'min(60vh, 600px)' }}
          className="max-h-[60vh] overflow-y-auto"
        >
          {sortedCategories.map((category) => {
            const displayName = category === 'all' ? 'All Categories' : category;
            const emoji = getCategoryEmoji(category);
            
            return (
              <SelectItem key={category} value={category} className="h-12">
                <span className="flex items-center gap-3">
                  <span className="text-xl">{emoji}</span>
                  <span className="text-base">{displayName}</span>
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
};