import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, icon, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:gap-4 mb-6 sm:mb-8",
        className,
      )}
    >
      <div className="min-w-0 flex items-start gap-3">
        {icon && (
          <div className="shrink-0 grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-2xl lg:text-3xl font-display font-semibold tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 justify-end">{actions}</div>}
    </header>
  );
}

interface PageSectionProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function PageSection({ title, description, actions, children, className, contentClassName }: PageSectionProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/50 bg-card shadow-sm",
        className,
      )}
    >
      {(title || actions) && (
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 sm:px-6 py-4 border-b border-border/50">
          <div className="min-w-0">
            {title && (
              <h2 className="text-base sm:text-lg font-display font-semibold tracking-tight truncate">
                {title}
              </h2>
            )}
            {description && <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2 justify-end">{actions}</div>}
        </header>
      )}
      <div className={cn("p-4 sm:p-6", contentClassName)}>{children}</div>
    </section>
  );
}
