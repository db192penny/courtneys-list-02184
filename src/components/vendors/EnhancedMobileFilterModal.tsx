// src/components/vendors/EnhancedMobileFilterModal.tsx
import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCategoryEmoji } from "@/utils/categoryEmojis";

interface EnhancedMobileFilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  categories: string[];
}


export const EnhancedMobileFilterModal: React.FC<EnhancedMobileFilterModalProps> = ({
  open,
  onOpenChange,
  selectedCategory,
  onCategoryChange,
  categories
}) => {
  const handleClearAll = () => {
    onCategoryChange('all');
    // NO onOpenChange(false) here
  };

  const handleCategorySelect = (category: string) => {
    onCategoryChange(category);
    // DO NOT close modal here
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] overflow-hidden flex flex-col">
        <SheetHeader className="flex-shrink-0 pb-3 border-b">
          <SheetTitle>Filter Categories</SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto py-3">
          {/* Compact Categories Section */}
          <div className="mb-4">
            <h3 className="font-medium text-gray-700 mb-2 px-1 text-sm">Choose Category</h3>
            <div className="grid grid-cols-2 gap-1.5">
              {['all', ...categories.slice(0, 9)].map((category) => {
                const displayName = category === 'all' ? 'All' : category;
                const icon = getCategoryEmoji(category);
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
                    <span className="text-sm">{icon}</span>
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
                    const icon = getCategoryEmoji(category);
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
                        <span className="text-sm">{icon}</span>
                        <span className="truncate">{category}</span>
                      </button>
                    );
                  })}
                </div>
              </details>
            )}
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