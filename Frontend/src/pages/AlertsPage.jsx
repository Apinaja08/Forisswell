import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

const isVolunteerProfileComplete = (profile) => {
  if (!profile) return false;
  return (
    profile.phone &&
    profile.skills &&
    profile.skills.length > 0 &&
    profile.location &&
    profile.emergencyContact &&
    profile.emergencyContact.name &&
    profile.emergencyContact.phone
  );
};

function AlertsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [nearbyAlerts, setNearbyAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadingAction, setLoadingAction] = useState({});
  const [activeTab, setActiveTab] = useState("my-alerts");
  const [volunteerProfile, setVolunteerProfile] = useState(null);
  const [checkingProfile, setCheckingProfile] = useState(true);

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

  // Check volunteer profile completeness
  useEffect(() => {
    const checkVolunteerProfile = async () => {
      if (user?.role !== "volunteer") {
        setCheckingProfile(false);
        return;
      }

      try {
        const response = await api.get("/volunteers/profile");
        const profile = response.data.data?.profile;
        setVolunteerProfile(profile);
        setCheckingProfile(false);
      } catch (err) {
        console.error("Failed to check volunteer profile:", err);
        setCheckingProfile(false);
      }
    };

    checkVolunteerProfile();
  }, [user?.role]);

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
      // Switch to ongoing process tab
      setActiveTab("ongoing");
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

  // Get ongoing alerts (assigned or in_progress)
  const ongoingAlerts = alerts.filter(
    (alert) => alert.status === "assigned" || alert.status === "in_progress"
  );

  // Get completed alerts
  const completedAlerts = alerts.filter((alert) => alert.status === "completed");

  return (
    <section className="space-y-4">
      {/* Beautiful Gradient Header */}
      <div className="relative overflow-hidden rounded-3xl shadow-2xl bg-gradient-to-r from-red-600 to-orange-500">
        {/* Decorative elements */}
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-20 bg-white" />
        <div className="absolute -left-12 -bottom-12 h-48 w-48 rounded-full opacity-10 bg-white" />
        
        <div className="relative px-6 py-8 md:px-8 md:py-10">
          <div className="max-w-3xl">
            <div className="mb-2">
              <Badge variant="danger" className="px-3 py-1 text-xs">
                🚨 LIVE ALERTS
              </Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Alert Management System
            </h1>
            <p className="text-red-100">
              Real-time weather-based tree care alerts with instant notifications and live updates
            </p>
          </div>
        </div>
      </div>

      {/* Profile Completeness Check for Volunteers */}
      {user?.role === "volunteer" && !checkingProfile && !isVolunteerProfileComplete(volunteerProfile) && (
        <Card className="border-0 overflow-hidden bg-gradient-to-r from-orange-50 to-red-50 shadow-lg">
          <div className="relative">
            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-orange-200 opacity-10" />
            <div className="relative flex items-center justify-between gap-4 p-4">
              <div className="flex-1">
                <h3 className="font-bold text-orange-900 text-lg">⚠️ Complete Your Profile</h3>
                <p className="mt-1 text-sm text-orange-700">
                  Your volunteer profile is incomplete. Add your skills, location, and emergency contact to accept alerts.
                </p>
              </div>
              <button
                onClick={() => navigate("/profile")}
                className="shrink-0 rounded-lg bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white px-4 py-2 font-semibold transition-all hover:shadow-lg"
              >
                Update Profile →
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Tab Navigation */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="flex gap-0.5 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab("my-alerts")}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
              activeTab === "my-alerts"
                ? "bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            📋 Completed ({alerts.filter(a => a.status === "completed").length})
          </button>
          <button
            onClick={() => setActiveTab("ongoing")}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
              activeTab === "ongoing"
                ? "bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            ⚡ Ongoing ({ongoingAlerts.length})
          </button>
          <button
            onClick={() => {
              if (user?.role === "volunteer" && !isVolunteerProfileComplete(volunteerProfile)) {
                navigate("/profile");
              } else {
                setActiveTab("nearby");
              }
            }}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
              activeTab === "nearby"
                ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
            title={
              user?.role === "volunteer" && !isVolunteerProfileComplete(volunteerProfile)
                ? "Complete your profile first"
                : "View nearby available alerts"
            }
          >
            📍 Nearby ({nearbyAlerts.length})
          </button>
        </div>
      </Card>

      {loading ? <LoadingSpinner label="Loading alerts..." /> : null}
      {error ? <FeedbackMessage tone="error">{error}</FeedbackMessage> : null}

      {!loading && !error ? (
        (() => {
          let displayAlerts = [];
          let emptyTitle = "";
          let emptyDescription = "";

          if (activeTab === "my-alerts") {
            displayAlerts = completedAlerts;
            emptyTitle = "No completed alerts";
            emptyDescription =
              "Completed alerts will appear here with their results and contributions.";
          } else if (activeTab === "ongoing") {
            displayAlerts = ongoingAlerts;
            emptyTitle = "No ongoing process";
            emptyDescription =
              "Accept an alert to start working on it. It will appear here as an active task.";
          } else if (activeTab === "nearby") {
            // Check if volunteer has incomplete profile
            if (user?.role === "volunteer" && !isVolunteerProfileComplete(volunteerProfile)) {
              displayAlerts = [];
              emptyTitle = "Complete Your Profile First";
              emptyDescription =
                "Update your volunteer profile with skills, location, and emergency contact to view and accept nearby alerts.";
            } else {
              displayAlerts = nearbyAlerts;
              emptyTitle = "No nearby alerts available";
              emptyDescription =
                "Move closer to trees or wait for new weather-based alerts in your area.";
            }
          }

          return displayAlerts.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
              title={emptyTitle}
              description={emptyDescription}
              actionLabel="Go to Dashboard"
              actionTo="/dashboard"
            />
          );
        })()
      ) : null}
    </section>
  );
}

export default AlertsPage;
