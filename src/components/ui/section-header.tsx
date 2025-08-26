import { LucideIcon } from "lucide-react";

interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
  className?: string;
}

export function SectionHeader({ icon: Icon, title, className = "" }: SectionHeaderProps) {
  return (
    <div className={`flex items-center gap-1.5 mb-2 ${className}`}>
      <Icon className="h-3 w-3 text-muted-foreground" />
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </span>
    </div>
  );
}