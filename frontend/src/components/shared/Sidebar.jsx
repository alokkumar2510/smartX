/**
 * ─── Sidebar.jsx ───────────────────────────────────────
 * Collapsible side panel showing online users, protocol
 * selector, and quick actions.
 */
import { motion, AnimatePresence } from 'framer-motion';
import UserAvatar from './UserAvatar';

const Sidebar = ({ isOpen, onClose, onlineUsers = [], currentProtocol, onProtocolChange }) => {
  const protocols = ['TCP', 'UDP', 'HYBRID', 'AUTO'];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm lg:hidden"
          />

          {/* Sidebar Panel */}
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed left-0 top-0 bottom-0 z-30 w-72 glass-strong border-r border-white/5 p-6 overflow-y-auto"
          >
            {/* Protocol Selector */}
            <div className="mb-8">
              <h3 className="text-label mb-3">Protocol</h3>
              <div className="grid grid-cols-2 gap-2">
                {protocols.map((proto) => (
                  <button
                    key={proto}
                    onClick={() => onProtocolChange?.(proto)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-300
                      ${currentProtocol === proto
                        ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                        : 'bg-white/5 text-white/40 border border-transparent hover:bg-white/10'
                      }
                    `}
                  >
                    {proto}
                  </button>
                ))}
              </div>
            </div>

            {/* Online Users */}
            <div>
              <h3 className="text-label mb-3">
                Online Users ({onlineUsers.length})
              </h3>
              <div className="space-y-2">
                {onlineUsers.map((user) => (
                  <UserAvatar key={user.id} user={user} showStatus />
                ))}
                {onlineUsers.length === 0 && (
                  <p className="text-xs text-white/20 text-center py-4">
                    No users online
                  </p>
                )}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default Sidebar;
