import { cn } from "@/lib/utils";

interface ReviewSourceIconProps {
  source: "bb" | "google";
  size?: "sm" | "md";
  className?: string;
}

export function ReviewSourceIcon({ 
  source, 
  size = "sm", 
  className 
}: ReviewSourceIconProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5"
  };

  if (source === "bb") {
    return (
      <div 
        className={cn(
          "rounded-sm bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs",
          sizeClasses[size],
          className
        )}
        aria-label="BlockBoard Review"
      >
        BB
      </div>
    );
  }

  if (source === "google") {
    return (
      <div 
        className={cn(
          "rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs",
          sizeClasses[size],
          className
        )}
        aria-label="Google Review"
      >
        G
      </div>
    );
  }

  return null;
}