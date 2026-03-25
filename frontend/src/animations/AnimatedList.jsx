/**
 * ─── AnimatedList.jsx ──────────────────────────────────
 * Renders children as a staggered animated list.
 */
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from './variants';

const AnimatedList = ({ children, className = '' }) => {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      {Array.isArray(children)
        ? children.map((child, i) => (
            <motion.div key={i} variants={staggerItem}>
              {child}
            </motion.div>
          ))
        : children
      }
    </motion.div>
  );
};

export default AnimatedList;
