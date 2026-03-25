/**
 * ─── LatencyGraph.jsx ──────────────────────────────────
 * Real-time latency line chart showing network response times.
 */
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

const LatencyGraph = ({ dataPoints = [] }) => {
  const labels = dataPoints.map((_, i) => `${i + 1}s`);

  const data = {
    labels,
    datasets: [
      {
        label: 'Latency (ms)',
        data: dataPoints,
        borderColor: '#00d4ff',
        backgroundColor: 'rgba(0, 212, 255, 0.05)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        display: false,
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
        ticks: { color: 'rgba(255, 255, 255, 0.3)', font: { size: 10 } },
      },
    },
    plugins: {
      legend: { display: false },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

  return (
    <div className="h-48">
      <Line data={data} options={options} />
    </div>
  );
};

export default LatencyGraph;
