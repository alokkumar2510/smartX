/**
 * ─── NetworkPage.jsx ───────────────────────────────────
 * Network visualization page with topology view and
 * packet flow animation.
 */
import PageTransition from '@/animations/PageTransition';
import TopologyView from '@/components/network/TopologyView';
import PacketFlow from '@/components/network/PacketFlow';
import Card from '@/components/ui/Card';

const NetworkPage = () => {
  // Sample topology data
  const nodes = [
    { id: 1, name: 'TCP Server',    status: 'online',   cpu: 23, latency: 5,  x: '10%', y: '30%' },
    { id: 2, name: 'UDP Server',    status: 'online',   cpu: 12, latency: 2,  x: '40%', y: '20%' },
    { id: 3, name: 'WS Bridge',     status: 'online',   cpu: 45, latency: 8,  x: '70%', y: '35%' },
    { id: 4, name: 'Load Balancer', status: 'degraded', cpu: 78, latency: 15, x: '40%', y: '60%' },
  ];

  return (
    <PageTransition>
      <div className="space-y-6">
        <h1 className="heading-section text-2xl gradient-text">
          🌐 Network Visualization
        </h1>

        {/* Topology */}
        <TopologyView nodes={nodes} connections={[]} />

        {/* Packet Flow */}
        <Card>
          <h3 className="text-label mb-3">Live Packet Flow</h3>
          <PacketFlow packets={[
            { id: 1, protocol: 'TCP' },
            { id: 2, protocol: 'UDP' },
          ]} />
        </Card>
      </div>
    </PageTransition>
  );
};

export default NetworkPage;
