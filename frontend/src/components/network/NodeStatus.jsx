/**
 * ─── NodeStatus.jsx ────────────────────────────────────
 * Server node status card showing health, CPU, and latency.
 */
import Badge from '@/components/ui/Badge';

const NodeStatus = ({ node }) => {
  const { name, status, cpu, latency } = node;

  return (
    <div className="glass-interactive rounded-xl p-3 min-w-[140px] cursor-pointer">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🖥️</span>
        <span className="text-xs font-semibold text-white truncate">{name}</span>
      </div>
      <Badge
        variant={status === 'online' ? 'success' : status === 'degraded' ? 'warning' : 'danger'}
        dot
      >
        {status}
      </Badge>
      <div className="mt-2 space-y-1">
        <div className="flex justify-between text-[10px] text-white/40">
          <span>CPU</span>
          <span>{cpu}%</span>
        </div>
        <div className="flex justify-between text-[10px] text-white/40">
          <span>Latency</span>
          <span>{latency}ms</span>
        </div>
      </div>
    </div>
  );
};

export default NodeStatus;
