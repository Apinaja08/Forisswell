import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import SectionHeader from "../components/ui/SectionHeader";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import StatCard from "../components/ui/StatCard";
import ContributionStats from "../components/volunteer/ContributionStats";

// Icons for quick actions
const ActionIcons = {
  alerts: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  trees: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  events: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  profile: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  monitor: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
};

const roleConfig = {
  user: {
    label: "Citizen User",
    tone: "leaf",
    gradient: "from-leaf-600 to-leaf-500",
    intro:
      "Monitor your trees, track weather care signals, and stay ahead of urgent conditions.",
    stats: [
      { title: "Monitored Trees", value: "12", helper: "Across active locations", tone: "leaf" },
      { title: "Open Alerts", value: "3", helper: "Need attention today", tone: "warning" },
      { title: "Upcoming Events", value: "4", helper: "Community activities", tone: "info" },
      { title: "Risk Zones Nearby", value: "2", helper: "Requiring follow-up", tone: "danger" },
    ],
    actions: [
      { to: "/trees", label: "Manage Trees", description: "Create, filter, and update your tree records.", icon: "trees" },
      { to: "/events", label: "View Events", description: "Join awareness and care sessions.", icon: "events" },
      { to: "/alerts", label: "Browse Alerts", description: "Monitor active alerts affecting your area.", icon: "alerts" },
    ],
  },
  volunteer: {
    label: "Volunteer Operator",
    tone: "warning",
    gradient: "from-amber-600 to-amber-500",
    intro:
      "Respond quickly to nearby alerts and improve completion performance with real-time task visibility.",
    stats: [
      { title: "Active Requests", value: "5", helper: "Within your preferred radius", tone: "warning" },
      { title: "Completion Rate", value: "87%", helper: "Last 30 assignments", tone: "success" },
      { title: "Total Hours", value: "146h", helper: "Community contribution", tone: "leaf" },
      { title: "Avg. Response", value: "18m", helper: "From assignment to start", tone: "info" },
    ],
    actions: [
      { to: "/alerts", label: "Open My Alerts", description: "Accept, start, and complete assigned alerts.", icon: "alerts" },
      { to: "/profile", label: "Update Availability", description: "Keep status and location current.", icon: "profile" },
      { to: "/events", label: "Join Field Events", description: "Participate in team interventions.", icon: "events" },
    ],
  },
  admin: {
    label: "Administration",
    tone: "info",
    gradient: "from-blue-600 to-blue-500",
    intro:
      "Oversee operational health, response throughput, and environmental risk from one command center.",
    stats: [
      { title: "System Alerts", value: "28", helper: "All priority levels", tone: "danger" },
      { title: "Available Volunteers", value: "42", helper: "Currently online", tone: "success" },
      { title: "Open Risk Cases", value: "11", helper: "Pending review", tone: "warning" },
      { title: "Events This Week", value: "7", helper: "Planned activities", tone: "info" },
    ],
    actions: [
      { to: "/alerts", label: "Monitor Alerts", description: "Track queue, response, and completions.", icon: "monitor" },
      { to: "/events", label: "Manage Events", description: "Control scheduling and participation.", icon: "events" },
      { to: "/trees", label: "Audit Tree Data", description: "Review inventory and data quality.", icon: "trees" },
    ],
  },
};

function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role || "user";
  const config = roleConfig[role] || roleConfig.user;

  const gradientClass = {
    user: "from-leaf-600 to-leaf-500",
    volunteer: "from-amber-600 to-amber-500",
    admin: "from-blue-600 to-blue-500",
  }[role] || "from-leaf-600 to-leaf-500";

  return (
    <section className="space-y-4">
      {/* Welcome Card with Gradient */}
      <div className={`relative overflow-hidden rounded-3xl shadow-2xl bg-gradient-to-r ${gradientClass}`}>
        {/* Decorative elements */}
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-20 bg-white" />
        <div className="absolute -left-12 -bottom-12 h-48 w-48 rounded-full opacity-10 bg-white" />
        
        <div className="relative px-6 py-8 md:px-8 md:py-10">
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <Badge variant={config.tone} className="px-4 py-2 text-sm">
                {config.label}
              </Badge>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Welcome back, {user?.fullName?.split(' ')[0] || "Member"}! 👋
            </h1>
            <p className="text-lg text-white/90 leading-relaxed">
              {config.intro}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {config.stats.map((item) => (
          <StatCard
            key={item.title}
            title={item.title}
            value={item.value}
            helper={item.helper}
            tone={item.tone}
          />
        ))}
      </div>

      {/* Contribution Stats for Volunteers */}
      {role === "volunteer" && <ContributionStats />}

      {/* Quick Actions */}
      <Card className="border-0 shadow-lg">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-900">Quick Actions</h2>
          <p className="mt-1 text-sm text-slate-600">Jump directly into your most common workflows.</p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-3">
          {config.actions.map((action) => {
            const IconComponent = ActionIcons[action.icon];
            return (
              <Link
                key={action.to}
                to={action.to}
                className="group relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-white p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-leaf-400"
              >
                {/* Hover background effect */}
                <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-leaf-50 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                
                <div className="relative">
                  {/* Icon */}
                  <div className="mb-2 inline-flex rounded-lg bg-leaf-100 p-2 text-leaf-600 group-hover:bg-leaf-200 transition-colors">
                    {IconComponent && <IconComponent />}
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-leaf-700 transition-colors">
                    {action.label}
                  </h3>
                  <p className="mt-1 text-xs text-slate-600 group-hover:text-slate-700 transition-colors">
                    {action.description}
                  </p>
                  
                  {/* Arrow indicator */}
                  <div className="mt-2 inline-flex items-center text-xs text-leaf-600 font-semibold group-hover:translate-x-0.5 transition-transform">
                    Get Started
                    <svg className="ml-1 w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </Card>
    </section>
  );
}

export default DashboardPage;
