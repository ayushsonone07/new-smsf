import type { CSSProperties, ReactNode } from "react";

import { Card as CardBase } from "@hrm/components/ui/card";
import { cn } from "@hrm/lib/utils";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
  style?: CSSProperties;
}

const paddingClasses = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

export function Card({ children, className, padding = "md", hover = false, style }: CardProps) {
  return (
    <CardBase
      className={cn(
        "mbg-card",
        paddingClasses[padding],
        hover && "mbg-card-hover",
        className,
      )}
      style={style}
    >
      {children}
    </CardBase>
  );
}
