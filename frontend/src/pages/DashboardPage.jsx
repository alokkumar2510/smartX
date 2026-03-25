/**
 * ─── DashboardPage.jsx ─────────────────────────────────
 * Analytics dashboard with stats cards, charts, and
 * network health monitoring.
 */
import PageTransition from '@/animations/PageTransition';
import AnimatedList from '@/animations/AnimatedList';
import StatsCard from '@/components/dashboard/StatsCard';
import ProtocolChart from '@/components/dashboard/ProtocolChart';
import LatencyGraph from '@/components/dashboard/LatencyGraph';
import MessageTimeline from '@/components/dashboard/MessageTimeline';
import NetworkHealthBar from '@/components/dashboard/NetworkHealthBar';
import Card from '@/components/ui/Card';

const DashboardPage = () => {
  // Sample data — in production, comes from useNetworkStats hook
  const latencyData = [12, 15, 11, 22, 18, 14, 16, 20, 13, 15, 12, 18, 14, 11, 17, 16];
  const timelineData = [
    { label: '10:00', count: 5 },
    { label: '10:05', count: 8 },
    { label: '10:10', count: 3 },
    { label: '10:15', count: 12 },
    { label: '10:20', count: 7 },
    { label: '10:25', count: 9 },
  ];

  return (
    <PageTransition>
      <div className="space-y-6">
        <h1 className="heading-section text-2xl gradient-text">
          📊 Analytics Dashboard
        </h1>

        {/* Stats Row */}
        <AnimatedList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard icon="📨" label="Total Messages" value="1,247" trend="12%" trendUp />
          <StatsCard icon="⚡" label="Avg Latency" value="14ms" trend="3ms" trendUp={false} />
          <StatsCard icon="👥" label="Online Users" value="8" />
          <StatsCard icon="🔒" label="Encrypted" value="98%" trend="2%" trendUp />
        </AnimatedList>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-label mb-4">Protocol Distribution</h3>
            <ProtocolChart tcpCount={45} udpCount={30} hybridCount={25} />
          </Card>
          <Card>
            <h3 className="text-label mb-4">Latency Over Time</h3>
            <LatencyGraph dataPoints={latencyData} />
          </Card>
        </div>

        {/* Timeline + Health */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-label mb-4">Message Activity</h3>
            <MessageTimeline timeline={timelineData} />
          </Card>
          <Card className="space-y-4">
            <h3 className="text-label">Network Health</h3>
            <NetworkHealthBar health={92} label="Overall Network" />
            <NetworkHealthBar health={98} label="TCP Connection" />
            <NetworkHealthBar health={85} label="UDP Stream" />
            <NetworkHealthBar health={75} label="WebSocket Bridge" />
          </Card>
        </div>
      </div>
    </PageTransition>
  );
};

export default DashboardPage;
