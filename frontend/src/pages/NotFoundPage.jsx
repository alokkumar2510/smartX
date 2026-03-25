/**
 * ─── NotFoundPage.jsx ──────────────────────────────────
 * 404 error page with animated illustration.
 */
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';

const NotFoundPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <motion.p
        className="text-8xl mb-6"
        animate={{ rotate: [0, 10, -10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        🔌
      </motion.p>
      <h1 className="heading-display text-4xl heading-gradient mb-3">
        Connection Lost
      </h1>
      <p className="text-white/40 mb-8 max-w-md">
        The page you`re looking for doesn`t exist. Looks like the packet got dropped!
      </p>
      <Link to="/">
        <Button variant="primary" id="go-home-button">
          ← Back to Home
        </Button>
      </Link>
    </div>
  );
};

export default NotFoundPage;
