import { Badge } from "@/components/ui/badge";
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
};

export default function UserBadge({ 
  name, 
  color, 
  icon, 
  className, 
  showName = true,
  size = "md" 
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

  return (
    <Badge
      className={cn(
        "inline-flex items-center gap-2 font-medium border-0 animate-fade-in hover-scale",
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: color,
        color: "#ffffff",
        background: `linear-gradient(135deg, ${color}, ${color}dd)`,
        boxShadow: `0 4px 12px ${color}33`
      }}
    >
      <IconComponent className={cn("flex-shrink-0", iconSizes[size])} />
      {showName && <span>{name}</span>}
    </Badge>
  );
}