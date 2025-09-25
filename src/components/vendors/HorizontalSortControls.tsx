import React from 'react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BarChart3, Users, Star } from "lucide-react";

interface SortOption {
  key: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

interface HorizontalSortControlsProps {
  selectedSort: string;
  onSortChange: (sort: string) => void;
  communityName: string;
}

export const HorizontalSortControls: React.FC<HorizontalSortControlsProps> = ({
  selectedSort,
  onSortChange,
  communityName
}) => {
  const sortOptions: SortOption[] = [
    {
      key: 'hoa_rating',
      label: 'Highest Rated',
      icon: <Star className="h-4 w-4" />,
      description: `Best ${communityName} reviews`
    },
    {
      key: 'homes',
      label: 'Most Used',
      icon: <Users className="h-4 w-4" />,
      description: 'Popular with neighbors'
    }
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
      {sortOptions.map((option) => {
        const isSelected = selectedSort === option.key;
        
        return (
          <Button
            key={option.key}
            variant={isSelected ? "default" : "outline"}
            size="sm"
            onClick={() => onSortChange(option.key)}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap min-w-fit transition-all duration-200 h-10",
              isSelected 
                ? "bg-primary text-primary-foreground shadow-md" 
                : "bg-background hover:bg-muted/50 border-border"
            )}
          >
            {option.icon}
            <span className="text-xs font-medium">{option.label}</span>
          </Button>
        );
      })}
    </div>
  );
};