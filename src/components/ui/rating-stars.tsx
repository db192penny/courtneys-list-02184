import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  rating: number;
  maxStars?: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  className?: string;
}

export function RatingStars({ 
  rating, 
  maxStars = 5, 
  size = "sm", 
  showValue = false,
  className 
}: RatingStarsProps) {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4", 
    lg: "h-5 w-5"
  };

  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = maxStars - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {/* Full stars */}
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star
          key={`full-${i}`}
          className={cn(
            sizeClasses[size],
            "fill-yellow-400 text-yellow-400"
          )}
        />
      ))}
      
      {/* Half star */}
      {hasHalfStar && (
        <div className="relative">
          <Star
            className={cn(
              sizeClasses[size],
              "fill-none text-muted-foreground"
            )}
          />
          <Star
            className={cn(
              sizeClasses[size],
              "absolute top-0 left-0 fill-yellow-400 text-yellow-400"
            )}
            style={{
              clipPath: "inset(0 50% 0 0)"
            }}
          />
        </div>
      )}
      
      {/* Empty stars */}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Star
          key={`empty-${i}`}
          className={cn(
            sizeClasses[size],
            "fill-none text-muted-foreground"
          )}
        />
      ))}
      
      {showValue && (
        <span className="ml-1 text-xs text-muted-foreground">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}