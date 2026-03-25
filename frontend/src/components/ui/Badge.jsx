/**
 * ─── Badge.jsx ─────────────────────────────────────────
 * Small status badge with color variants.
 */
import clsx from 'clsx';

const BADGE_VARIANTS = {
  success: 'bg-green-500/20 text-green-400 border-green-500/30',
  warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  danger:  'bg-red-500/20 text-red-400 border-red-500/30',
  info:    'bg-blue-500/20 text-blue-400 border-blue-500/30',
  neutral: 'bg-white/10 text-white/60 border-white/10',
};

const Badge = ({ children, variant = 'neutral', dot = false, className = '' }) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
        'text-[11px] font-semibold uppercase tracking-wide border',
        BADGE_VARIANTS[variant],
        className
      )}
    >
      {dot && (
        <span className={clsx(
          'w-1.5 h-1.5 rounded-full',
          variant === 'success' && 'bg-green-400 animate-pulse',
          variant === 'warning' && 'bg-yellow-400',
          variant === 'danger'  && 'bg-red-400 animate-pulse',
          variant === 'info'    && 'bg-blue-400',
          variant === 'neutral' && 'bg-white/40',
        )} />
      )}
      {children}
    </span>
  );
};

export default Badge;
