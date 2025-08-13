import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

type AdminBadgeProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

export default function AdminBadge({ className, size = "md" }: AdminBadgeProps) {
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base"
  };
  
  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4", 
    lg: "w-5 h-5"
  };

  return (
    <Badge
      className={cn(
        "inline-flex items-center gap-2 font-bold border-0 animate-fade-in hover-scale",
        "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
        "shadow-lg shadow-amber-500/25",
        sizeClasses[size],
        className
      )}
    >
      <Shield className={cn("flex-shrink-0", iconSizes[size])} />
      <span>Admin</span>
    </Badge>
  );
}