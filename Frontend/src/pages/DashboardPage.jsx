import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import SectionHeader from "../components/ui/SectionHeader";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import StatCard from "../components/ui/StatCard";

const roleConfig = {
  user: {
    label: "Citizen User",
    tone: "leaf",
    intro:
      "Monitor your trees, track weather care signals, and stay ahead of urgent conditions.",
    stats: [
      { title: "Monitored Trees", value: "12", helper: "Across active locations", tone: "leaf" },
      { title: "Open Alerts", value: "3", helper: "Need attention today", tone: "warning" },
      { title: "Upcoming Events", value: "4", helper: "Community activities", tone: "info" },
      { title: "Risk Zones Nearby", value: "2", helper: "Requiring follow-up", tone: "danger" },
    ],
    actions: [
      { to: "/trees", label: "Manage Trees", description: "Create, filter, and update your tree records." },
      { to: "/events", label: "View Events", description: "Join awareness and care sessions." },
      { to: "/alerts", label: "Review Alerts", description: "Track weather-triggered alert updates." },
    ],
  },
  volunteer: {
    label: "Volunteer Operator",
    tone: "warning",
    intro:
      "Respond quickly to nearby alerts and improve completion performance with real-time task visibility.",
    stats: [
      { title: "Active Requests", value: "5", helper: "Within your preferred radius", tone: "warning" },
      { title: "Completion Rate", value: "87%", helper: "Last 30 assignments", tone: "success" },
      { title: "Total Hours", value: "146h", helper: "Community contribution", tone: "leaf" },
      { title: "Avg. Response", value: "18m", helper: "From assignment to start", tone: "info" },
    ],
    actions: [
      { to: "/alerts", label: "Open My Alerts", description: "Accept, start, and complete assigned alerts." },
      { to: "/profile", label: "Update Availability", description: "Keep status and location current." },
      { to: "/events", label: "Join Field Events", description: "Participate in team interventions." },
    ],
  },
  admin: {
    label: "Administration",
    tone: "info",
    intro:
      "Oversee operational health, response throughput, and environmental risk from one command center.",
    stats: [
      { title: "System Alerts", value: "28", helper: "All priority levels", tone: "danger" },
      { title: "Available Volunteers", value: "42", helper: "Currently online", tone: "success" },
      { title: "Open Risk Cases", value: "11", helper: "Pending review", tone: "warning" },
      { title: "Events This Week", value: "7", helper: "Planned activities", tone: "info" },
    ],
    actions: [
      { to: "/alerts", label: "Monitor Alerts", description: "Track queue, response, and completions." },
      { to: "/events", label: "Manage Events", description: "Control scheduling and participation." },
      { to: "/trees", label: "Audit Tree Data", description: "Review inventory and data quality." },
    ],
  },
};

function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role || "user";
  const config = roleConfig[role] || roleConfig.user;

  return (
    <section className="space-y-6">
      <Card className="relative overflow-hidden border-leaf-100 bg-white/90">
        <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-leaf-100/60" />
        <div className="relative">
          <SectionHeader
            title={`Welcome back, ${user?.fullName || "Member"}`}
            subtitle={config.intro}
            right={<Badge variant={config.tone}>{config.label}</Badge>}
          />
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

      <Card>
        <SectionHeader
          title="Quick Actions"
          subtitle="Jump directly into your most common workflows."
        />
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {config.actions.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-leaf-300 hover:shadow-soft"
            >
              <h3 className="font-semibold text-slate-900 group-hover:text-leaf-700">{action.label}</h3>
              <p className="mt-1 text-sm text-slate-600">{action.description}</p>
            </Link>
          ))}
        </div>
      </Card>
    </section>
  );
}

export default DashboardPage;
