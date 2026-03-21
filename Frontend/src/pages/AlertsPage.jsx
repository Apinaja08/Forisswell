import { useEffect, useState } from "react";
import api from "../services/api";
import LoadingSpinner from "../components/common/LoadingSpinner";
import SectionHeader from "../components/ui/SectionHeader";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import FeedbackMessage from "../components/ui/FeedbackMessage";
import EmptyState from "../components/ui/EmptyState";

const priorityTone = {
  critical: "danger",
  high: "warning",
  medium: "info",
  low: "leaf",
};

const statusTone = {
  pending: "warning",
  assigned: "info",
  in_progress: "leaf",
  completed: "success",
  cancelled: "neutral",
  expired: "danger",
};

function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAlerts = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/alerts/my-alerts");
        setAlerts(response.data.data?.alerts || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load alerts");
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  return (
    <section className="space-y-6">
      <Card className="border-leaf-100 bg-white/90">
        <SectionHeader
          title="My Alert Queue"
          subtitle="Track assignments, response status, and completion workflow in real time."
          right={<Badge variant="warning">{alerts.length} Alerts</Badge>}
        />
      </Card>

      {loading ? <LoadingSpinner label="Loading alerts..." /> : null}
      {error ? <FeedbackMessage tone="error">{error}</FeedbackMessage> : null}

      {!loading && !error ? (
        alerts.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {alerts.map((alert) => (
              <Card key={alert._id} className="transition hover:-translate-y-0.5 hover:shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {(alert.type || "alert").replaceAll("_", " ")}
                  </h2>
                  <div className="flex gap-2">
                    <Badge variant={priorityTone[alert.priority] || "neutral"}>
                      {alert.priority || "unknown"}
                    </Badge>
                    <Badge variant={statusTone[alert.status] || "neutral"}>
                      {alert.status || "pending"}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                  <p><span className="font-semibold text-slate-800">Tree:</span> {alert.tree?.name || alert.tree?.species || "-"}</p>
                  <p><span className="font-semibold text-slate-800">Created:</span> {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : "-"}</p>
                  <p><span className="font-semibold text-slate-800">Priority:</span> {alert.priority || "-"}</p>
                  <p><span className="font-semibold text-slate-800">Status:</span> {alert.status || "-"}</p>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No assigned alerts"
            description="When alerts are assigned to your account, they will appear here with priority and status details."
            actionLabel="Go to Dashboard"
            actionTo="/dashboard"
          />
        )
      ) : null}
    </section>
  );
}

export default AlertsPage;
