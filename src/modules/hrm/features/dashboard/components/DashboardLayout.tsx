import { Children, type ReactNode } from "react";

import { motion } from "framer-motion";

import { StaggerContainer, StaggerItem } from "@shared/components/ui";

import { cn } from "@hrm/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
  className?: string;
}

interface DashboardWelcomeHeaderProps {
  title: string;
  description?: string;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function DashboardLayout({ children, className }: DashboardLayoutProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn("space-y-4", className)}
    >
      {children}
    </motion.div>
  );
}

export function DashboardWelcomeHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: DashboardWelcomeHeaderProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "mbg-card relative overflow-hidden px-5 py-4 sm:px-6 bg-gradient-to-br from-card via-card to-primary-soft/30 border-l-4 border-l-primary shadow-md",
        className,
      )}
    >
      <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
      <div className="relative z-10 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          {eyebrow ? <div className="mb-1.5">{eyebrow}</div> : null}
          <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl bg-gradient-to-r from-foreground via-foreground/90 to-primary bg-clip-text text-transparent">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-xs sm:text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </motion.section>
  );
}

export function DashboardKpiGrid({ children, className }: DashboardLayoutProps) {
  return (
    <StaggerContainer
      className={cn(
        "grid auto-rows-fr grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4",
        className,
      )}
    >
      {Children.map(children, (child) => (
        <StaggerItem variant="card">{child}</StaggerItem>
      ))}
    </StaggerContainer>
  );
}

export function DashboardSplitGrid({ children, className }: DashboardLayoutProps) {
  return (
    <StaggerContainer className={cn("grid grid-cols-1 items-stretch gap-3 xl:grid-cols-2", className)}>
      {Children.map(children, (child) => (
        <StaggerItem variant="card">{child}</StaggerItem>
      ))}
    </StaggerContainer>
  );
}
