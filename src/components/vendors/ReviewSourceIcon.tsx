import { cn } from "@/lib/utils";

interface ReviewSourceIconProps {
  source: "bb" | "google";
  size?: "sm" | "md";
  className?: string;
  communityPhotoUrl?: string | null;
}

export function ReviewSourceIcon({ 
  source, 
  size = "sm", 
  className,
  communityPhotoUrl 
}: ReviewSourceIconProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5"
  };

  if (source === "bb") {
    // If community photo exists, show it as a circular logo with purple border
    if (communityPhotoUrl) {
      return (
        <div 
          className={cn(
            "rounded-full overflow-hidden ring-2 ring-purple-500/50 shadow-sm",
            sizeClasses[size],
            className
          )}
          aria-label="Community Review"
        >
          <img 
            src={communityPhotoUrl} 
            alt="Community logo"
            className="w-full h-full object-cover"
          />
        </div>
      );
    }
    
    // Fallback to BB badge if no photo
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