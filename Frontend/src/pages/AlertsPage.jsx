import { useEffect, useState } from "react";
import api from "../services/api";
import LoadingSpinner from "../components/common/LoadingSpinner";

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
    <section className="space-y-4">
      <div className="card">
        <h1 className="text-xl font-semibold">My Alerts</h1>
        <p className="text-sm text-slate-600">Connected to `GET /api/alerts/my-alerts`.</p>
      </div>

      {loading ? <LoadingSpinner label="Loading alerts..." /> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && !error ? (
        <div className="grid gap-3 md:grid-cols-2">
          {alerts.map((alert) => (
            <article key={alert._id} className="card">
              <h2 className="font-semibold">{alert.type?.replaceAll("_", " ")}</h2>
              <p className="text-sm text-slate-600">Priority: {alert.priority}</p>
              <p className="text-sm text-slate-600">Status: {alert.status}</p>
              <p className="text-sm text-slate-600">Tree: {alert.tree?.name || alert.tree?.species}</p>
            </article>
          ))}
          {alerts.length === 0 ? <p className="text-slate-500">No alerts assigned.</p> : null}
        </div>
      ) : null}
    </section>
  );
}

export default AlertsPage;
