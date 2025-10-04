import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectScrollUpButton, SelectScrollDownButton } from "@/components/ui/select";
import { getCategoryEmoji } from "@/utils/categoryEmojis";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronUp, ChevronDown } from "lucide-react";

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

  return (
    <div>
      <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2 block">
        Choose Category
      </label>
      
      <Select value={selectedCategory} onValueChange={onCategoryChange}>
        <SelectTrigger className={isMobile ? "w-full h-11 text-left text-sm" : "w-full h-12 text-left"}>
          <SelectValue>
            <span className="flex items-center gap-2">
              {getDisplayValue()}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className={isMobile ? "max-h-[60vh]" : "max-h-[70vh]"}>
          <SelectScrollUpButton>
            <ChevronUp className="h-4 w-4" />
          </SelectScrollUpButton>
          {sortedCategories.map((category) => {
            const displayName = category === 'all' ? 'All Categories' : category;
            const emoji = getCategoryEmoji(category);
            
            return (
              <SelectItem 
                key={category} 
                value={category} 
                className={isMobile ? "h-10 cursor-pointer" : "h-11 cursor-pointer"}
              >
                <span className="flex items-center gap-2">
                  <span className={isMobile ? "text-base" : "text-lg"}>{emoji}</span>
                  <span className={isMobile ? "text-sm" : "text-base"}>{displayName}</span>
                </span>
              </SelectItem>
            );
          })}
          <SelectScrollDownButton>
            <ChevronDown className="h-4 w-4" />
          </SelectScrollDownButton>
        </SelectContent>
      </Select>
    </div>
  );
};
