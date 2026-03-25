/**
 * ─── ProtocolChart.jsx ─────────────────────────────────
 * Doughnut chart showing TCP vs UDP vs Hybrid message
 * distribution using Chart.js.
 */
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const ProtocolChart = ({ tcpCount = 0, udpCount = 0, hybridCount = 0 }) => {
  const data = {
    labels: ['TCP', 'UDP', 'Hybrid'],
    datasets: [
      {
        data: [tcpCount, udpCount, hybridCount],
        backgroundColor: [
          'rgba(59, 130, 246, 0.6)',   // Blue for TCP
          'rgba(34, 197, 94, 0.6)',    // Green for UDP
          'rgba(168, 85, 247, 0.6)',   // Purple for Hybrid
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(168, 85, 247, 1)',
        ],
        borderWidth: 2,
        cutout: '65%',
        borderRadius: 4,
        spacing: 3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: 'rgba(255, 255, 255, 0.6)',
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 8,
          font: { size: 12, family: 'Inter' },
        },
      },
    },
  };

  return (
    <div className="h-64">
      <Doughnut data={data} options={options} />
    </div>
  );
};

export default ProtocolChart;
