/**
 * ─── PageTransition.jsx ────────────────────────────────
 * Wrapper component for animated page enter/exit transitions.
 */
import { motion } from 'framer-motion';
import { pageTransition } from './variants';

const PageTransition = ({ children }) => {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageTransition}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
