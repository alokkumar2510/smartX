import { motion, AnimatePresence } from 'framer-motion';
import { Doughnut } from 'react-chartjs-2';

const AnalyticsPanel = ({ show, messages, networkStats, onClose }) => {
  const tcpCount = messages.filter(m => m.protocol === 'TCP').length;
  const udpCount = messages.filter(m => m.protocol === 'UDP').length;
  const droppedCount = messages.filter(m => m.dropped).length;
  const deliveredCount = messages.filter(m => m.delivered || m.type === 'message_sent').length;

  const protocolChart = {
    labels: ['TCP', 'UDP'],
    datasets: [{
      data: [tcpCount || 1, udpCount || 1],
      backgroundColor: ['rgba(0,240,255,0.25)', 'rgba(255,45,120,0.25)'],
      borderColor: ['#00f0ff', '#ff2d78'],
      borderWidth: 2,
      hoverOffset: 8,
    }],
  };

  const deliveryChart = {
    labels: ['Delivered', 'Dropped'],
    datasets: [{
      data: [deliveredCount || 1, droppedCount || 0],
      backgroundColor: ['rgba(0,255,136,0.25)', 'rgba(255,45,120,0.25)'],
      borderColor: ['#00ff88', '#ff2d78'],
      borderWidth: 2,
    }],
  };

  const bridgeStats = networkStats?.bridge_stats || {};

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          className="w-80 h-full border-l border-white/[0.04] flex flex-col overflow-hidden"
          style={{ background: 'rgba(14,14,34,0.95)', backdropFilter: 'blur(20px)' }}
        >
          <div className="p-4 border-b border-white/[0.04] flex items-center justify-between">
            <h3 className="font-orbitron text-xs text-neon-gradient tracking-wider">NETWORK ANALYTICS</h3>
            <button onClick={onClose} className="text-white/20 hover:text-white/50 text-sm">✕</button>
          </div>

          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            <div className="stat-card">
              <div className="stat-label">Total Messages</div>
              <div className="stat-value text-neon-cyan" style={{ fontSize: '1.5rem' }}>{messages.length}</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="stat-card">
                <div className="stat-label">TCP (Reliable)</div>
                <div className="stat-value text-neon-cyan" style={{ fontSize: '1.2rem' }}>{tcpCount}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">UDP (Fast)</div>
                <div className="stat-value text-neon-pink" style={{ fontSize: '1.2rem' }}>{udpCount}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="stat-card">
                <div className="stat-label">Delivered ✓✓</div>
                <div className="stat-value" style={{ fontSize: '1.2rem', color: '#00ff88' }}>{deliveredCount}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Dropped ✕</div>
                <div className="stat-value text-neon-pink" style={{ fontSize: '1.2rem' }}>{droppedCount}</div>
              </div>
            </div>

            <div className="glass-card p-4">
              <h4 className="text-[9px] font-orbitron text-white/30 uppercase tracking-widest mb-3">Protocol Distribution</h4>
              <div className="h-40">
                <Doughnut data={protocolChart} options={{
                  responsive: true, maintainAspectRatio: false, cutout: '65%',
                  plugins: { legend: { display: false } }
                }} />
              </div>
              <div className="flex justify-center gap-4 mt-3">
                <span className="flex items-center gap-1 text-[9px] font-mono text-neon-cyan">
                  <span className="w-2 h-2 rounded-full bg-neon-cyan" style={{ boxShadow: '0 0 4px #00f0ff' }} /> TCP
                </span>
                <span className="flex items-center gap-1 text-[9px] font-mono text-neon-pink">
                  <span className="w-2 h-2 rounded-full bg-neon-pink" style={{ boxShadow: '0 0 4px #ff2d78' }} /> UDP
                </span>
              </div>
            </div>

            {bridgeStats.tcp_messages_sent !== undefined && (
              <div className="glass-card p-4">
                <h4 className="text-[9px] font-orbitron text-white/30 uppercase tracking-widest mb-3">Network Bridge</h4>
                <div className="space-y-2 text-[10px] font-mono text-white/40">
                  <div className="flex justify-between">
                    <span>TCP Delivery Rate</span>
                    <span className="text-neon-cyan">{bridgeStats.tcp_delivery_rate || '100%'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>UDP Delivery Rate</span>
                    <span className="text-neon-pink">{bridgeStats.udp_delivery_rate || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>UDP Drop Rate</span>
                    <span style={{ color: '#ff2d78' }}>{bridgeStats.udp_drop_rate || '0%'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TCP Bytes Sent</span>
                    <span className="text-white/50">{bridgeStats.tcp_bytes_sent || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>UDP Bytes Sent</span>
                    <span className="text-white/50">{bridgeStats.udp_bytes_sent || 0}</span>
                  </div>
                  {bridgeStats.packet_engine && (
                    <>
                      <div className="flex justify-between">
                        <span>Packets Created</span>
                        <span className="text-white/50">{bridgeStats.packet_engine.packets_created || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Packets Fragmented</span>
                        <span className="text-white/50">{bridgeStats.packet_engine.packets_fragmented || 0}</span>
                      </div>
                    </>
                  )}
                  {bridgeStats.ack_manager && (
                    <>
                      <div className="flex justify-between">
                        <span>ACKs Received</span>
                        <span className="text-neon-cyan">{bridgeStats.ack_manager.acks_received || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Retransmissions</span>
                        <span style={{ color: '#ffaa00' }}>{bridgeStats.ack_manager.retransmissions || 0}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="glass-card p-4">
              <h4 className="text-[9px] font-orbitron text-white/30 uppercase tracking-widest mb-3">Delivery Success</h4>
              <div className="h-32">
                <Doughnut data={deliveryChart} options={{
                  responsive: true, maintainAspectRatio: false, cutout: '70%',
                  plugins: { legend: { display: false } }
                }} />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AnalyticsPanel;
