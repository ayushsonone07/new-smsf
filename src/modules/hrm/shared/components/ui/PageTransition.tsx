import type { ReactNode } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";

import { staggerContainer, pageTransition } from "@shared/lib/animations";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className = "" }: PageTransitionProps) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        transition={pageTransition}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}