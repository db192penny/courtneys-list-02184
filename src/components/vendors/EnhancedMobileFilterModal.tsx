// src/components/vendors/EnhancedMobileFilterModal.tsx
import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCategoryIcon } from "@/utils/categoryIcons";
import { Home } from "lucide-react";

// Category-specific colors to make icons visually appealing
const CATEGORY_COLORS: Record<string, string> = {
  'all': 'text-blue-600',
  'HVAC': 'text-orange-500',
  'Pool': 'text-blue-500', 
  'Landscaping': 'text-green-500',
  'Plumbing': 'text-blue-600',
  'Electrical': 'text-yellow-500',
  'Pest Control': 'text-red-500',
  'House Cleaning': 'text-purple-500',
  'Handyman': 'text-amber-600',
  'Painters': 'text-indigo-500',
  'Power Washing': 'text-cyan-500',
  'Car Wash & Detail': 'text-gray-600',
  'Pet Grooming': 'text-pink-500',
  'Mobile Tire Repair': 'text-slate-600',
  'Appliance Repair': 'text-emerald-600',
  'Water Filtration': 'text-blue-400',
  'Interior Design': 'text-violet-500',
};

interface EnhancedMobileFilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCategory: string;
  selectedSort: string;
  onCategoryChange: (category: string) => void;
  onSortChange: (sort: string) => void;
  categories: string[];
}


const SORT_OPTIONS = [
  { 
    value: 'neighbors_using', 
    label: 'Most Used by Neighbors', 
    description: 'Popular choices in your community' 
  },
  { 
    value: 'highest_rated', 
    label: 'Highest Rated', 
    description: 'Best neighbor reviews first' 
  },
  { 
    value: 'most_reviews', 
    label: 'Most Reviews', 
    description: 'Most neighbor feedback' 
  },
  { 
    value: 'recently_added', 
    label: 'Recently Added', 
    description: 'Newest provider recommendations' 
  }
];

export const EnhancedMobileFilterModal: React.FC<EnhancedMobileFilterModalProps> = ({
  open,
  onOpenChange,
  selectedCategory,
  selectedSort,
  onCategoryChange,
  onSortChange,
  categories
}) => {
  const handleClearAll = () => {
    onCategoryChange('all');
    onSortChange('neighbors_using');
    // NO onOpenChange(false) here
  };

  const handleCategorySelect = (category: string) => {
    onCategoryChange(category);
    // DO NOT close modal here
  };

  const handleSortSelect = (sort: string) => {
    onSortChange(sort);
    // DO NOT close modal here
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] overflow-hidden flex flex-col">
        <SheetHeader className="flex-shrink-0 pb-3 border-b">
          <SheetTitle>Filter & Sort</SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto py-3">
          {/* Compact Categories Section */}
          <div className="mb-4">
            <h3 className="font-medium text-gray-700 mb-2 px-1 text-sm">Choose Category</h3>
            <div className="grid grid-cols-2 gap-1.5">
              {['all', ...categories.slice(0, 9)].map((category) => {
                const displayName = category === 'all' ? 'All' : category;
                const IconComponent = category === 'all' ? Home : getCategoryIcon(category as any);
                const iconColor = CATEGORY_COLORS[category] || 'text-gray-600';
                const isSelected = selectedCategory === category;
                
                return (
                  <button
                    key={category}
                    onClick={() => handleCategorySelect(category)}
                    className={cn(
                      "min-h-[40px] px-2 py-2 text-xs font-medium rounded-lg text-left transition-colors flex items-center gap-1.5",
                      isSelected
                        ? "bg-blue-50 border-2 border-blue-500 text-blue-700"
                        : "bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <IconComponent className={cn("w-4 h-4 flex-shrink-0", isSelected ? "text-blue-700" : iconColor)} />
                    <span className="truncate">{displayName}</span>
                  </button>
                );
              })}
            </div>
            
            {/* Show More Categories */}
            {categories.length > 9 && (
              <details className="mt-2">
                <summary className="text-sm text-blue-600 font-medium cursor-pointer px-1">
                  Show {categories.length - 9} more categories
                </summary>
                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  {categories.slice(9).map((category) => {
                    const IconComponent = getCategoryIcon(category as any);
                    const iconColor = CATEGORY_COLORS[category] || 'text-gray-600';
                    const isSelected = selectedCategory === category;
                    
                    return (
                      <button
                        key={category}
                        onClick={() => handleCategorySelect(category)}
                        className={cn(
                          "min-h-[40px] px-2 py-2 text-xs font-medium rounded-lg text-left transition-colors flex items-center gap-1.5",
                          isSelected
                            ? "bg-blue-50 border-2 border-blue-500 text-blue-700"
                            : "bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100"
                        )}
                      >
                        <IconComponent className={cn("w-4 h-4 flex-shrink-0", isSelected ? "text-blue-700" : iconColor)} />
                        <span className="truncate">{category}</span>
                      </button>
                    );
                  })}
                </div>
              </details>
            )}
          </div>

          {/* Sort Options - Now Visible */}
          <div className="border-t pt-4">
            <h3 className="font-medium text-gray-700 mb-2 px-1 text-sm">Sort By</h3>
            <div className="space-y-1">
              {SORT_OPTIONS.map((option) => {
                const isSelected = selectedSort === option.value;
                
                return (
                  <button
                    key={option.value}
                    onClick={() => handleSortSelect(option.value)}
                    className={cn(
                      "w-full min-h-[40px] flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left",
                      isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center",
                      isSelected ? "border-blue-500 bg-blue-500" : "border-gray-300"
                    )}>
                      {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                    
                    <div className="flex-1">
                      <div className={cn(
                        "text-sm font-medium",
                        isSelected ? "text-blue-700" : "text-gray-700"
                      )}>
                        {option.label}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Apply Button */}
        <div className="border-t bg-white p-3">
          <Button 
            onClick={() => onOpenChange(false)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
            size="lg"
          >
            Apply
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EnhancedMobileFilterModal;