import type { Transition, Variants } from "framer-motion";

export const motionTransition: Transition = {
  duration: 0.28,
  ease: "easeOut",
};

export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 14,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut",
      when: "beforeChildren",
      staggerChildren: 0.06,
    },
  },
  exit: {
    opacity: 0,
    y: 8,
    transition: {
      duration: 0.18,
      ease: "easeIn",
    },
  },
};

export const sectionVariants: Variants = {
  initial: {
    opacity: 0,
    y: 18,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: motionTransition,
  },
};

export const staggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.04,
    },
  },
};

/** Centered auth card — scale + fade entrance */
export const authCardVariants: Variants = {
  initial: {
    opacity: 0,
    y: 24,
    scale: 0.96,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1],
      when: "beforeChildren",
      staggerChildren: 0.08,
      delayChildren: 0.12,
    },
  },
};

export const fadeUpItemVariants: Variants = {
  initial: {
    opacity: 0,
    y: 14,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: "easeOut",
    },
  },
};

export const tableRowVariants: Variants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.22,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.16,
      ease: "easeIn",
    },
  },
};
