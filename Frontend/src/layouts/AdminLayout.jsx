import { useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cx } from "../utils/cx";

function AdminLayout({ children }) {
  const location = useLocation();

  const adminNav = useMemo(
    () => [
      { to: "/admin", label: "Dashboard", icon: "📊" },
      { to: "/admin/alerts", label: "Alerts Management", icon: "⚠️" },
      { to: "/admin/volunteers", label: "Volunteer Directory", icon: "👥" },
      { to: "/admin/leaderboard", label: "Leaderboard", icon: "🏆" },
      { to: "/admin/map", label: "Map View", icon: "🗺️" },
      { to: "/admin/reports", label: "Reports & Analytics", icon: "📈" },
      { to: "/admin/settings", label: "Settings", icon: "⚙️" },
    ],
    []
  );

  const navLinkClass = ({ isActive }) =>
    cx(
      "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
      isActive
        ? "bg-blue-100 text-blue-700"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    );

  return (
    <div className="flex min-h-[calc(100vh-4rem)] gap-6">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white p-4">
        <div className="mb-6 rounded-lg bg-blue-50 p-4 border border-blue-200">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Admin Panel</p>
          <p className="mt-1 text-sm font-bold text-blue-900">System Management</p>
        </div>

        <nav className="space-y-2">
          {adminNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={navLinkClass}
              end={item.to === "/admin"}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-8 border-t border-slate-200 pt-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Recent sections</p>
          <p className="mt-2 text-xs text-slate-400">Navigate using the menu above</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

export default AdminLayout;
