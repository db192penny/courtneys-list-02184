// src/components/vendors/EnhancedMobileFilterModal.tsx
import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EnhancedMobileFilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCategory: string;
  selectedSort: string;
  onCategoryChange: (category: string) => void;
  onSortChange: (sort: string) => void;
  categories: string[];
}

const CATEGORY_ICONS: Record<string, string> = {
  'all': '🏠',
  'HVAC': '🔧',
  'Pool': '🏊',
  'Landscaping': '🌱',
  'Plumbing': '🚰',
  'Electrical': '⚡',
  'Pest Control': '🐛',
  'House Cleaning': '🧹',
  'Handyman': '🔨',
  'Roofing': '🏠',
  'General Contractor': '👷',
  'Car Wash and Detail': '🚗',
  'Pet Grooming': '🐕',
  'Mobile Tire Repair': '🔧',
  'Appliance Repair': '🔌'
};

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
        <SheetHeader className="flex-shrink-0 pb-4 border-b">
          <div className="flex justify-between items-center">
            <SheetTitle>Filter & Sort</SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-blue-600 hover:text-blue-700"
            >
              Clear All
            </Button>
          </div>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto py-4">
          {/* Categories Section */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-700 mb-3 px-1">Service Category</h3>
            <div className="grid grid-cols-2 gap-2">
              {['all', ...categories].map((category) => {
                const displayName = category === 'all' ? 'All Categories' : category;
                const icon = CATEGORY_ICONS[category] || '🏠';
                const isSelected = selectedCategory === category;
                
                return (
                  <button
                    key={category}
                    onClick={() => handleCategorySelect(category)}
                    className={cn(
                      "min-h-[44px] p-3 text-sm font-medium rounded-lg text-left transition-colors flex items-center gap-2",
                      isSelected
                        ? "bg-blue-50 border-2 border-blue-500 text-blue-700"
                        : "bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <span className="text-base">{icon}</span>
                    <span className="truncate">{displayName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort Options Section */}
          <div>
            <h3 className="font-medium text-gray-700 mb-3 px-1">Sort By</h3>
            <div className="space-y-2">
              {SORT_OPTIONS.map((option) => {
                const isSelected = selectedSort === option.value;
                
                return (
                  <button
                    key={option.value}
                    onClick={() => handleSortSelect(option.value)}
                    className={cn(
                      "w-full min-h-[44px] flex items-start gap-3 p-3 rounded-lg transition-colors text-left",
                      isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center",
                      isSelected ? "border-blue-500 bg-blue-500" : "border-gray-300"
                    )}>
                      {isSelected && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className={cn(
                        "font-medium",
                        isSelected ? "text-blue-700" : "text-gray-700"
                      )}>
                        {option.label}
                      </div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        {option.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Sticky Action Buttons */}
        <div className="sticky bottom-0 left-0 right-0 bg-white border-t p-4 flex gap-2">
          <Button 
            onClick={() => onOpenChange(false)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium"
            size="lg"
          >
            Apply Filters
          </Button>
          <Button 
            variant="outline"
            onClick={handleClearAll}
            className="flex-1 font-medium"
            size="lg"
          >
            Clear All
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EnhancedMobileFilterModal;