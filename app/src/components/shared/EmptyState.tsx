import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-4">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <Icon className="w-6 h-6 text-muted-foreground" />
        </div>
      )}
      <div className="space-y-1">
        <p className="font-medium text-foreground">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
