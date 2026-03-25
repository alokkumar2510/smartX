/**
 * ─── TopologyView.jsx ──────────────────────────────────
 * Network topology visualization showing server nodes
 * and connections as an animated SVG diagram.
 */
import { motion } from 'framer-motion';
import NodeStatus from './NodeStatus';

const TopologyView = ({ nodes = [], connections = [] }) => {
  return (
    <div className="relative w-full h-96 glass rounded-2xl p-6 overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Connection Lines (SVG) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {connections.map((conn, i) => (
          <motion.line
            key={i}
            x1={conn.from.x} y1={conn.from.y}
            x2={conn.to.x} y2={conn.to.y}
            stroke="rgba(0, 212, 255, 0.3)"
            strokeWidth="2"
            strokeDasharray="6 4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, delay: i * 0.2 }}
          />
        ))}
      </svg>

      {/* Server Nodes */}
      {nodes.map((node, i) => (
        <motion.div
          key={node.id}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.15, type: 'spring' }}
          className="absolute"
          style={{ left: node.x, top: node.y }}
        >
          <NodeStatus node={node} />
        </motion.div>
      ))}

      {/* Empty State */}
      {nodes.length === 0 && (
        <div className="flex items-center justify-center h-full text-white/20">
          <p className="text-sm">No active nodes to display</p>
        </div>
      )}
    </div>
  );
};

export default TopologyView;
