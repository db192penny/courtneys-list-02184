import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCategoryEmoji } from "@/utils/categoryEmojis";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronDown } from "lucide-react";

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
  const isMobile = useIsMobile();
  
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

  // Mobile: Use native HTML select for perfect scrolling
  if (isMobile) {
    return (
      <div>
        <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2 block">
          Choose Category
        </label>
        
        <div className="relative">
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full h-12 px-3 pr-10 rounded-md border border-input bg-background text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {sortedCategories.map((category) => {
              const displayName = category === 'all' ? '🏠 All Categories' : `${getCategoryEmoji(category)} ${category}`;
              return (
                <option key={category} value={category}>
                  {displayName}
                </option>
              );
            })}
          </select>
          
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
        </div>
      </div>
    );
  }

  // Desktop: Keep the Radix UI Select component
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
        <SelectContent className="max-h-[60vh] overflow-y-auto">
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
