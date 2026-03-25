/**
 * ─── Card.jsx ──────────────────────────────────────────
 * Glassmorphism card wrapper with hover animation.
 * Used as the primary container throughout the app.
 */
import { motion } from 'framer-motion';
import clsx from 'clsx';

const Card = ({
  children,
  className = '',
  hover = true,
  neon = false,
  padding = 'p-6',
  ...props
}) => {
  return (
    <motion.div
      whileHover={hover ? { y: -2, scale: 1.005 } : {}}
      transition={{ duration: 0.2 }}
      className={clsx(
        'rounded-2xl border transition-all duration-300',
        neon ? 'glass-neon' : 'glass',
        padding,
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default Card;
