/**
 * ─── Transition Configs ────────────────────────────────
 * Predefined transition timing configurations.
 */

export const springTransition = {
  type: 'spring',
  stiffness: 300,
  damping: 25,
};

export const smoothTransition = {
  type: 'tween',
  duration: 0.4,
  ease: 'easeInOut',
};

export const fastTransition = {
  type: 'tween',
  duration: 0.15,
  ease: 'easeOut',
};

export const bounceTransition = {
  type: 'spring',
  stiffness: 400,
  damping: 15,
};
