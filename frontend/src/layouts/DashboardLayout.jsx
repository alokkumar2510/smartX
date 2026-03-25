/**
 * ─── DashboardLayout.jsx ───────────────────────────────
 * Dashboard-specific layout with grid-friendly container.
 */
import { Outlet } from 'react-router-dom';

const DashboardLayout = () => {
  return (
    <div className="space-y-6">
      <Outlet />
    </div>
  );
};

export default DashboardLayout;
