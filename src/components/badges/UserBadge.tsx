import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Users, 
  Heart, 
  Star, 
  Crown, 
  Trophy,
  Lock,
  CheckCircle,
  LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const iconMap: Record<string, LucideIcon> = {
  user: User,
  users: Users,
  heart: Heart,
  star: Star,
  crown: Crown,
  trophy: Trophy,
};

type UserBadgeProps = {
  name: string;
  color: string;
  icon: string;
  className?: string;
  showName?: boolean;
  size?: "sm" | "md" | "lg";
  state?: "locked" | "next" | "current" | "earned";
  pointsToUnlock?: number;
};

export default function UserBadge({ 
  name, 
  color, 
  icon, 
  className, 
  showName = true,
  size = "md",
  state = "earned",
  pointsToUnlock
}: UserBadgeProps) {
  const IconComponent = iconMap[icon] || Star;
  
  const sizeClasses = {
    sm: "px-2 py-1 text-xs min-h-[28px] min-w-[28px]",
    md: "px-3 py-1.5 text-sm min-h-[36px] min-w-[36px]",
    lg: "px-4 py-2 text-base min-h-[48px] min-w-[48px]"
  };
  
  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4", 
    lg: "w-6 h-6"
  };

  const getStateStyles = () => {
    switch (state) {
      case "locked":
        return {
          opacity: "0.4",
          filter: "saturate(0.3)",
          animation: "none"
        };
      case "next":
        return {
          opacity: "0.7",
          animation: "pulse-glow 2s ease-in-out infinite",
          boxShadow: `0 0 20px ${color}40, 0 4px 12px ${color}33`
        };
      case "current":
        return {
          background: `linear-gradient(135deg, ${color}, ${color}dd, ${color})`,
          backgroundSize: "200% 100%",
          animation: "shimmer 2s linear infinite",
          boxShadow: `0 0 15px ${color}60, 0 4px 12px ${color}33`
        };
      case "earned":
      default:
        return {
          background: `linear-gradient(135deg, ${color}, ${color}dd)`,
          boxShadow: `0 4px 12px ${color}33`
        };
    }
  };

  const badgeContent = (
    <Badge
      className={cn(
        "relative inline-flex items-center gap-2 font-medium border-0 transition-all duration-300 hover:scale-105",
        sizeClasses[size],
        state === "locked" && "hover:opacity-80 hover:filter-none",
        className
      )}
      style={{
        backgroundColor: color,
        color: "#ffffff",
        ...getStateStyles()
      }}
    >
      <div className="relative flex items-center gap-2">
        <IconComponent className={cn("flex-shrink-0", iconSizes[size])} />
        {showName && <span>{name}</span>}
        
        {state === "earned" && (
          <CheckCircle className={cn("flex-shrink-0 text-green-400", 
            size === "sm" ? "w-3 h-3" : size === "md" ? "w-4 h-4" : "w-5 h-5",
            "animate-bounce-in")} />
        )}
        
        {state === "locked" && (
          <Lock className={cn("absolute -top-1 -right-1 bg-badge-locked rounded-full p-0.5", 
            size === "sm" ? "w-3 h-3" : size === "md" ? "w-4 h-4" : "w-5 h-5")} />
        )}
      </div>
    </Badge>
  );

  if (state === "locked" && pointsToUnlock) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badgeContent}
          </TooltipTrigger>
          <TooltipContent>
            <p>{pointsToUnlock} points needed to unlock</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badgeContent;
}