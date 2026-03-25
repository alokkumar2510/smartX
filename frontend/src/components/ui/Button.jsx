/**
 * ─── Button.jsx ────────────────────────────────────────
 * Reusable button component with multiple variants.
 */
import { motion } from 'framer-motion';
import clsx from 'clsx';

const VARIANTS = {
  primary:   'btn-primary',
  secondary: 'btn-secondary',
  ghost:     'px-4 py-2 text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300',
  danger:    'px-6 py-2.5 rounded-xl font-semibold text-white bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 transition-all duration-300',
};

const SIZES = {
  sm: 'text-xs px-3 py-1.5',
  md: '',
  lg: 'text-lg px-8 py-3',
};

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  onClick,
  id,
  ...props
}) => {
  return (
    <motion.button
      id={id}
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        VARIANTS[variant],
        SIZES[size],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export default Button;
