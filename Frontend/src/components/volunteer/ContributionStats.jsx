import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import SectionHeader from "../ui/SectionHeader";
import api from "../../services/api";

function ContributionStats() {
  const [stats, setStats] = useState({
    totalAlerts: 0,
    completedAlerts: 0,
    acceptedAlerts: 0,
    cancelledAlerts: 0,
    totalHours: 0,
    averageCompletionTime: 0,
  });
  const [status, setStatus] = useState("available");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);

  // Fetch volunteer profile and stats
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get("/volunteers/profile");
        console.log("Volunteer profile response:", response.data);
        if (response.data?.data?.profile) {
          const profile = response.data.data.profile;
          console.log("Profile stats:", profile.stats);
          setStats(profile.stats || {});
          setStatus(profile.status || "available");
        } else {
          setError("Volunteer profile not found. Please complete your profile first.");
        }
      } catch (err) {
        console.error("Error fetching volunteer profile:", err);
        setError(err.response?.data?.message || "Failed to load contribution stats");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Handle status update
  const handleStatusChange = async (newStatus) => {
    try {
      setUpdating(true);
      await api.patch("/volunteers/status", { status: newStatus });
      setStatus(newStatus);
      setError(null);
    } catch (err) {
      setError("Failed to update status");
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const completionRate =
    stats.totalAlerts > 0
      ? Math.round((stats.completedAlerts / stats.totalAlerts) * 100)
      : 0;

  const getStatusVariant = () => {
    switch (status) {
      case "available":
        return "success";
      case "busy":
        return "warning";
      case "offline":
        return "neutral";
      default:
        return "neutral";
    }
  };

  const getStatusLabel = () => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const StatItem = ({ label, value, subtext, tone = "leaf", icon: Icon }) => (
    <div className="group rounded-lg border-2 border-slate-100 bg-gradient-to-br from-slate-50 to-white p-3 transition-all hover:border-amber-200 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value ?? "0"}</p>
          {subtext && <p className="mt-0.5 text-xs text-slate-500">{subtext}</p>}
        </div>
        {Icon && (
          <div className="text-xl opacity-30 group-hover:opacity-50 transition-opacity">
            {Icon}
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <p className="text-slate-600">Loading contribution stats...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <p className="text-slate-600 font-medium">{error}</p>
            <p className="mt-2 text-xs text-slate-500">
              Complete your volunteer profile to start tracking contributions.
            </p>
            <Link
              to="/profile"
              className="mt-4 inline-block rounded-lg bg-leaf-600 px-4 py-2 text-sm font-semibold text-white hover:bg-leaf-700 transition"
            >
              Go to Profile
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main Contribution Stats Card */}
      <Card className="border-0 shadow-lg overflow-hidden">
        {/* Header with gradient background */}
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-6 border-b border-amber-100">
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-amber-200 opacity-10" />
          <div className="relative flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                📊 Contribution Stats
              </h2>
              <p className="mt-0.5 text-xs text-slate-600">
                Track your volunteer performance and impact.
              </p>
            </div>
            <Badge variant={getStatusVariant()} className="px-3 py-1 text-xs">
              ● {getStatusLabel()}
            </Badge>
          </div>
        </div>

        {/* Stats Content */}
        <div className="space-y-4 p-6">
          {/* Alert Stats Row */}
          <div>
            <h3 className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">Assignments Overview</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatItem
                label="Total Alerts"
                value={stats.totalAlerts}
                subtext="Assigned to you"
              />
              <StatItem
                label="Completed"
                value={stats.completedAlerts}
                subtext="Successfully finished"
              />
              <StatItem
                label="Accepted"
                value={stats.acceptedAlerts}
                subtext="Alerts acknowledged"
              />
              <StatItem
                label="Cancelled"
                value={stats.cancelledAlerts}
                subtext="Cancelled alerts"
              />
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">Performance Metrics</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatItem
                label="Total Hours"
                value={(stats.totalHours ?? 0).toFixed(1)}
                subtext="Community contribution"
              />
              <StatItem
                label="Completion Rate"
                value={`${completionRate}%`}
                subtext="Success rate"
              />
              <StatItem
                label="Avg Completion Time"
                value={`${Math.round(stats.averageCompletionTime ?? 0)}`}
                subtext="Minutes per alert"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Status Update Card */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-50 to-cyan-50 px-6 py-6 border-b border-blue-100">
          <div className="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-blue-200 opacity-10" />
          <div className="relative">
            <h2 className="text-xl font-bold text-slate-900">⚡ Quick Status Update</h2>
            <p className="mt-0.5 text-xs text-slate-600">Let teams know your current availability</p>
          </div>
        </div>

        <div className="p-6">
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { value: "available", label: "🟢 Available", icon: "✓", bgColor: "from-green-50 to-emerald-50", borderColor: "border-green-300", textColor: "text-green-700" },
              { value: "busy", label: "🟡 Busy", icon: "⏳", bgColor: "from-amber-50 to-yellow-50", borderColor: "border-amber-300", textColor: "text-amber-700" },
              { value: "offline", label: "⚫ Offline", icon: "✕", bgColor: "from-slate-50 to-gray-50", borderColor: "border-slate-300", textColor: "text-slate-700" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => handleStatusChange(option.value)}
                disabled={updating}
                className={`group relative overflow-hidden rounded-lg border-2 px-4 py-3 text-center transition-all duration-300 transform hover:scale-105 ${
                  status === option.value
                    ? `bg-gradient-to-br ${option.bgColor} ${option.borderColor} shadow-lg ${option.textColor} font-bold`
                    : "bg-white border-slate-200 text-slate-600 hover:border-amber-300 hover:shadow-md"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="relative">
                  <p className="text-sm font-bold">{option.label}</p>
                  {status === option.value && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-20">
                      <div className="animate-pulse text-lg">{option.icon}</div>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
          {error && (
            <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-xs text-red-700 font-medium">{error}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export default ContributionStats;
