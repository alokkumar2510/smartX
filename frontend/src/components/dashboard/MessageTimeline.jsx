/**
 * ─── MessageTimeline.jsx ───────────────────────────────
 * Timeline bar chart showing message activity over time.
 */
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const MessageTimeline = ({ timeline = [] }) => {
  const data = {
    labels: timeline.map((t) => t.label),
    datasets: [
      {
        label: 'Messages',
        data: timeline.map((t) => t.count),
        backgroundColor: 'rgba(59, 130, 246, 0.4)',
        borderColor: 'rgba(59, 130, 246, 0.8)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: 'rgba(255, 255, 255, 0.3)', font: { size: 10 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
        ticks: { color: 'rgba(255, 255, 255, 0.3)', stepSize: 1 },
      },
    },
    plugins: { legend: { display: false } },
  };

  return (
    <div className="h-48">
      <Bar data={data} options={options} />
    </div>
  );
};

export default MessageTimeline;
