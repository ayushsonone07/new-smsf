import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

import {
  fadeUp,
  fadeUpFast,
  fadeUpSubtle,
  staggerContainer,
  staggerContainerFast,
  staggerItem,
  staggerItemCard,
  staggerItemSubtle,
  listVariants,
  listItemVariants,
  tableRowVariants,
  sectionVariants,
  headerVariants,
} from "@shared/lib/animations";

type MotionDivProps = HTMLMotionProps<"div">;
type MotionSectionProps = HTMLMotionProps<"section">;
type MotionArticleProps = HTMLMotionProps<"article">;
type MotionTableRowProps = HTMLMotionProps<"tr">;

interface FadeUpProps extends MotionDivProps {
  variant?: "default" | "fast" | "subtle";
  delay?: number;
}

export const FadeUp = ({
  variant = "default",
  delay = 0,
  children,
  className,
  style,
  ...props
}: FadeUpProps) => {
  const variants = variant === "fast" ? fadeUpFast : variant === "subtle" ? fadeUpSubtle : fadeUp;
  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="visible"
      style={{ ...style, transitionDelay: `${delay}s` }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

interface StaggerContainerProps extends MotionDivProps {
  fast?: boolean;
  delayChildren?: number;
  staggerChildren?: number;
}

export const StaggerContainer = ({
  fast = false,
  delayChildren,
  staggerChildren,
  children,
  className,
  ...props
}: StaggerContainerProps) => {
  const containerVariants = fast ? staggerContainerFast : staggerContainer;
  const customVariants = {
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerChildren ?? (fast ? 0.04 : 0.06),
        delayChildren: delayChildren ?? (fast ? 0.04 : 0.08),
      },
    },
  } as const;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      custom={customVariants}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

interface StaggerItemProps extends MotionDivProps {
  variant?: "default" | "card" | "subtle";
}

export const StaggerItem = ({
  variant = "default",
  children,
  className,
  ...props
}: StaggerItemProps) => {
  const variants =
    variant === "card" ? staggerItemCard : variant === "subtle" ? staggerItemSubtle : staggerItem;
  return (
    <motion.div
      variants={variants}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

interface SectionProps extends MotionSectionProps {
  variant?: "default" | "header";
}

export const AnimatedSection = ({
  variant = "default",
  children,
  className,
  ...props
}: SectionProps) => {
  const variants = variant === "header" ? headerVariants : sectionVariants;
  return (
    <motion.section
      variants={variants}
      initial="hidden"
      animate="visible"
      className={className}
      {...props}
    >
      {children}
    </motion.section>
  );
};

export const AnimatedArticle = ({ children, className, ...props }: MotionArticleProps) => (
  <motion.article
    variants={fadeUp}
    initial="hidden"
    animate="visible"
    className={className}
    {...props}
  >
    {children}
  </motion.article>
);

export const AnimatedTableRow = ({ children, className, ...props }: MotionTableRowProps) => (
  <motion.tr
    variants={tableRowVariants}
    initial="hidden"
    animate="visible"
    className={className}
    {...props}
  >
    {children}
  </motion.tr>
);

export const AnimatedList = ({ children, className, ...props }: MotionDivProps) => (
  <motion.div
    variants={listVariants}
    initial="hidden"
    animate="visible"
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

export const AnimatedListItem = ({ children, className, ...props }: MotionDivProps) => (
  <motion.div
    variants={listItemVariants}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

export const CardEntrance = ({
  children,
  className,
  delay = 0,
  ...props
}: { children: ReactNode; className?: string; delay?: number }) => (
  <motion.div
    variants={staggerItemCard}
    initial="hidden"
    animate="visible"
    style={{ transitionDelay: `${delay}s` }}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

export const AnimatedPageHeader = ({
  children,
  className,
  ...props
}: { children: ReactNode; className?: string }) => (
  <motion.div
    variants={fadeUpFast}
    initial="hidden"
    animate="visible"
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

export const PageContent = ({
  children,
  className,
  ...props
}: { children: ReactNode; className?: string }) => (
  <motion.div
    variants={fadeUp}
    initial="hidden"
    animate="visible"
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);