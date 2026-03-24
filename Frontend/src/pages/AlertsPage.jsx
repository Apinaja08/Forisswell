import { useEffect, useState } from "react";
import api from "../services/api";
import * as socketService from "../services/socketService";
import { useAuth } from "../hooks/useAuth";
import LoadingSpinner from "../components/common/LoadingSpinner";
import SectionHeader from "../components/ui/SectionHeader";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import FeedbackMessage from "../components/ui/FeedbackMessage";
import EmptyState from "../components/ui/EmptyState";
import AlertCard from "../components/ui/AlertCard";

function AlertsPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [nearbyAlerts, setNearbyAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadingAction, setLoadingAction] = useState({});
  const [activeTab, setActiveTab] = useState("my-alerts");

  // Fetch my alerts
  const fetchMyAlerts = async () => {
    try {
      const response = await api.get("/alerts/my-alerts");
      setAlerts(response.data.data?.alerts || []);
    } catch (err) {
      console.error("Failed to load my alerts:", err);
    }
  };

  // Fetch nearby available alerts
  const fetchNearbyAlerts = async () => {
    try {
      const response = await api.get("/alerts/nearby");
      setNearbyAlerts(response.data.data?.alerts || []);
    } catch (err) {
      console.error("Failed to load nearby alerts:", err);
    }
  };

  // Initial load
  useEffect(() => {
    const loadAlerts = async () => {
      setLoading(true);
      setError("");

      try {
        await Promise.all([fetchMyAlerts(), fetchNearbyAlerts()]);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load alerts");
      } finally {
        setLoading(false);
      }
    };

    loadAlerts();
  }, []);

  // Setup Socket.io listeners for real-time alerts
  useEffect(() => {
    if (!user) return;

    // Initialize Socket.io connection
    const token = localStorage.getItem("forisswell_token");
    if (token) {
      socketService.initializeSocket(token);
    }

    // Listen for new alerts
    const unsubscribeNewAlert = socketService.onNewAlert((alertData) => {
      console.log("📍 New alert received:", alertData);
      // Add to nearby alerts with a notification
      setNearbyAlerts((prev) => [alertData, ...prev]);
      // Show success notification
      setError(""); // Clear any previous errors
    });

    // Listen for alert accepted by others
    const unsubscribeAlertAccepted = socketService.onAlertAccepted((data) => {
      console.log("✅ Alert accepted by another volunteer:", data.alertId);
      // Remove from nearby alerts
      setNearbyAlerts((prev) =>
        prev.filter((alert) => alert.id !== data.alertId && alert._id !== data.alertId)
      );
    });

    // Listen for alert completed
    const unsubscribeAlertCompleted = socketService.onAlertCompleted((data) => {
      console.log("🎉 Alert completed:", data);
      // Refresh my alerts
      fetchMyAlerts();
    });

    // Listen for alert expired
    const unsubscribeAlertExpired = socketService.onAlertExpired((data) => {
      console.log("⏰ Alert expired:", data);
      setError("Your assigned alert expired due to inactivity");
      fetchMyAlerts();
    });

    // Cleanup
    return () => {
      unsubscribeNewAlert();
      unsubscribeAlertAccepted();
      unsubscribeAlertCompleted();
      unsubscribeAlertExpired();
    };
  }, [user]);

  // Accept alert
  const handleAcceptAlert = async (alertId) => {
    setLoadingAction((prev) => ({ ...prev, [alertId]: true }));
    try {
      const response = await api.post(`/alerts/${alertId}/accept`);
      console.log("✅ Alert accepted:", response.data);
      
      // Remove from nearby and add to my alerts
      setNearbyAlerts((prev) =>
        prev.filter((alert) => alert.id !== alertId && alert._id !== alertId)
      );
      
      // Refresh alerts
      await fetchMyAlerts();
      setError("");
    } catch (err) {
      const message = err.response?.data?.message || "Failed to accept alert";
      console.error(message, err);
      setError(message);
      // Refresh in case alert was taken by someone else
      await fetchNearbyAlerts();
    } finally {
      setLoadingAction((prev) => ({ ...prev, [alertId]: false }));
    }
  };

  // Start work
  const handleStartAlert = async (alertId) => {
    setLoadingAction((prev) => ({ ...prev, [alertId]: true }));
    try {
      const response = await api.post(`/alerts/${alertId}/start`);
      console.log("🚀 Work started:", response.data);
      await fetchMyAlerts();
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to start work");
    } finally {
      setLoadingAction((prev) => ({ ...prev, [alertId]: false }));
    }
  };

  // Complete alert
  const handleCompleteAlert = async (alertId) => {
    setLoadingAction((prev) => ({ ...prev, [alertId]: true }));
    try {
      const response = await api.post(`/alerts/${alertId}/complete`, {
        notes: "Completed the required actions",
        photoUrls: [],
      });
      console.log("🎉 Alert completed:", response.data);
      await fetchMyAlerts();
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to complete alert");
    } finally {
      setLoadingAction((prev) => ({ ...prev, [alertId]: false }));
    }
  };

  // Cancel alert
  const handleCancelAlert = async (alertId) => {
    setLoadingAction((prev) => ({ ...prev, [alertId]: true }));
    try {
      const response = await api.post(`/alerts/${alertId}/cancel`, {
        reason: "Cannot complete this alert",
      });
      console.log("❌ Alert cancelled:", response.data);
      await fetchMyAlerts();
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to cancel alert");
    } finally {
      setLoadingAction((prev) => ({ ...prev, [alertId]: false }));
    }
  };

  const displayAlerts = activeTab === "my-alerts" ? alerts : nearbyAlerts;

  return (
    <section className="space-y-6">
      <Card className="border-leaf-100 bg-white/90">
        <SectionHeader
          title="🚨 Alert System"
          subtitle="Real-time weather-based tree care alerts with live updates"
          right={<Badge variant="warning">{alerts.length} My Alerts</Badge>}
        />
      </Card>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("my-alerts")}
          className={`px-4 py-2 font-medium transition ${
            activeTab === "my-alerts"
              ? "border-b-2 border-green-600 text-green-600"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          📋 My Alerts ({alerts.length})
        </button>
        <button
          onClick={() => setActiveTab("nearby")}
          className={`px-4 py-2 font-medium transition ${
            activeTab === "nearby"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          📍 Nearby Alerts ({nearbyAlerts.length})
        </button>
      </div>

      {loading ? <LoadingSpinner label="Loading alerts..." /> : null}
      {error ? <FeedbackMessage tone="error">{error}</FeedbackMessage> : null}

      {!loading && !error ? (
        displayAlerts.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {displayAlerts.map((alert) => (
              <AlertCard
                key={alert._id || alert.id}
                alert={alert}
                onAccept={() => handleAcceptAlert(alert._id || alert.id)}
                onStart={() => handleStartAlert(alert._id || alert.id)}
                onComplete={() => handleCompleteAlert(alert._id || alert.id)}
                onCancel={() => handleCancelAlert(alert._id || alert.id)}
                isLoading={loadingAction[alert._id || alert.id] || false}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title={
              activeTab === "my-alerts"
                ? "No assigned alerts"
                : "No nearby alerts available"
            }
            description={
              activeTab === "my-alerts"
                ? "When alerts are assigned to your account, they will appear here with priority and status details."
                : "Move closer to trees or wait for new weather-based alerts in your area."
            }
            actionLabel="Go to Dashboard"
            actionTo="/dashboard"
          />
        )
      ) : null}
    </section>
  );
}

export default AlertsPage;
