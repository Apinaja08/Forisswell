import { useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cx } from "../utils/cx";

function AdminLayout({ children }) {
  const location = useLocation();

  const adminNav = useMemo(
    () => [
      { to: "/admin", label: "Dashboard" },
      { to: "/admin/alerts", label: "Alerts Management" },
      { to: "/risk-analysis", label: "Risk Analysis"},
      { to: "/admin/volunteers", label: "Volunteer Directory" },
      { to: "/admin/leaderboard", label: "Leaderboard" },
      { to: "/admin/map", label: "Map View" },
      { to: "/admin/reports", label: "Reports & Analytics" },
      { to: "/admin/settings", label: "Settings" },
    ],
    []
  );

  const navLinkClass = ({ isActive }) =>
    cx(
      "flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors",
      isActive
        ? "bg-green-100 text-green-700"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    );

  // Get current page title for breadcrumbs
  const getPageTitle = () => {
    const currentNav = adminNav.find(item => item.to === location.pathname);
    if (currentNav) return currentNav.label;
    
    if (location.pathname === "/risk-analysis") return "Risk Analysis";
    if (location.pathname.startsWith("/risk-analysis/")) return "Risk Details";
    return "Admin Dashboard";
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] gap-6">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white p-4">
        <div className="mb-6 rounded-lg bg-green-50 p-4 border border-green-200">
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wider">Admin Panel</p>
          <p className="mt-1 text-sm font-bold text-green-900">Forest Management System</p>
        </div>

        <nav className="space-y-2">
          {adminNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={navLinkClass}
              end={item.to === "/admin"}
            >
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-8 border-t border-slate-200 pt-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">System Status</p>
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">API Status:</span>
              <span className="text-green-600 font-medium">● Online</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Last Sync:</span>
              <span className="text-slate-600">{new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-4 p-3 bg-slate-50 rounded-lg">
          <p className="text-xs font-semibold text-slate-600 mb-2">Quick Stats</p>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Forest Cover</span>
              <span className="font-medium text-green-600">~68%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Active Alerts</span>
              <span className="font-medium text-orange-600">12</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Monitored Areas</span>
              <span className="font-medium text-blue-600">156</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Breadcrumb Navigation */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-6 py-3 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">{getPageTitle()}</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {location.pathname === "/risk-analysis" 
                  ? "Monitor forest areas, track deforestation risks, and analyze encroachment patterns"
                  : location.pathname.startsWith("/risk-analysis/")
                  ? "View detailed risk assessment and analysis results"
                  : "Manage forest monitoring system and review alerts"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 text-slate-500 hover:text-green-600 transition rounded-lg hover:bg-green-50">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button className="p-2 text-slate-500 hover:text-green-600 transition rounded-lg hover:bg-green-50">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="px-6 pb-6">
          {children}
        </div>
      </main>
    </div>
  );
}

export default AdminLayout;