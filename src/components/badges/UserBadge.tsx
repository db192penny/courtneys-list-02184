import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  User, 
  Users, 
  Heart, 
  Star, 
  Crown, 
  Trophy,
  LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  progress?: number; // 0-1 for progressive fill when locked
  isLocked?: boolean;
  isCurrent?: boolean;
  isNext?: boolean;
  pointsToUnlock?: number;
};

export default function UserBadge({ 
  name, 
  color, 
  icon, 
  className, 
  showName = true,
  size = "md",
  progress = 1,
  isLocked = false,
  isCurrent = false,
  isNext = false,
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

  // Calculate colors based on state
  const getBackgroundStyle = () => {
    if (isLocked) {
      const progressColor = `${color}${Math.round(progress * 255).toString(16).padStart(2, '0')}`;
      const baseGray = "hsl(var(--muted))";
      return {
        background: `linear-gradient(135deg, ${progressColor} ${progress * 100}%, ${baseGray} ${progress * 100}%)`,
        color: progress > 0.5 ? "#ffffff" : "hsl(var(--muted-foreground))",
      };
    }
    
    return {
      backgroundColor: color,
      color: "#ffffff",
      background: `linear-gradient(135deg, ${color}, ${color}dd)`,
      boxShadow: `0 4px 12px ${color}33`
    };
  };

  const badge = (
    <Badge
      className={cn(
        "inline-flex items-center gap-2 font-medium border-0 transition-all duration-300",
        "hover:scale-105 hover:shadow-lg",
        sizeClasses[size],
        isLocked && "hover:brightness-125",
        isCurrent && "animate-pulse",
        isNext && "ring-2 ring-accent ring-offset-2 animate-pulse",
        className
      )}
      style={getBackgroundStyle()}
    >
      <IconComponent className={cn("flex-shrink-0 transition-transform", iconSizes[size])} />
      {showName && <span className="transition-colors">{name}</span>}
    </Badge>
  );

  if (isLocked && pointsToUnlock) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badge}
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-sm">
              {pointsToUnlock} more {pointsToUnlock === 1 ? 'point' : 'points'} to unlock
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}