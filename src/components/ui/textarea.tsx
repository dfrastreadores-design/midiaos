import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.ComponentProps<"textarea"> {
  error?: boolean | string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    const isInvalid =
      !!error || props["aria-invalid"] === true || props["aria-invalid"] === "true";
    return (
      <textarea
        aria-invalid={isInvalid ? true : undefined}
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          isInvalid &&
            "!border-red-500 !bg-red-50/70 dark:!bg-red-950/30 !ring-2 !ring-red-500/40 focus-visible:!ring-red-500",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };

