import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import FeedbackMessage from "../../components/ui/FeedbackMessage";
import Card from "../../components/ui/Card";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";

function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recentAlerts, setRecentAlerts] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch statistics
      const statsRes = await fetch("http://localhost:5000/api/alerts/statistics", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("forisswell_token")}`,  
        },
      });

      if (!statsRes.ok) {
        // Provide default empty stats if API fails
        setStats({
          overview: {
            total: 0,
            pending: 0,
            assigned: 0,
            inProgress: 0,
            completed: 0,
            cancelled: 0,
            critical: 0,
            high: 0,
          },
          averageResponseTimeMinutes: 0,
        });
      } else {
        const statsData = await statsRes.json();
        setStats(statsData.data);
      }

      // Fetch recent completed alerts
      const alertsRes = await fetch(
        "http://localhost:5000/api/alerts?status=completed&limit=10&sort=-completedAt",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("forisswell_token")}`,  
          },
        }
      );

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setRecentAlerts(alertsData.data?.alerts || []);
      }
    } catch (err) {
      // Don't show error, use default data
      console.error("Dashboard error:", err);
      setStats({
        overview: {
          total: 0,
          pending: 0,
          assigned: 0,
          inProgress: 0,
          completed: 0,
          cancelled: 0,
          critical: 0,
          high: 0,
        },
        averageResponseTimeMinutes: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 p-6">
      <SectionHeader
        title="Admin Dashboard"
        description="System overview and key metrics"
      />

      {error && <FeedbackMessage tone="error">{error}</FeedbackMessage>}

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Alerts"
            value={stats.overview?.total || 0}
            trend={null}
            color="bg-blue"
          />
          <StatCard
            label="Pending Alerts"
            value={stats.overview?.pending || 0}
            trend={null}
            color="bg-red"
            onClick={() => navigate("/admin/alerts?status=pending")}
          />
          <StatCard
            label="In Progress"
            value={stats.overview?.inProgress || 0}
            trend={null}
            color="bg-yellow"
          />
          <StatCard
            label="Completed"
            value={stats.overview?.completed || 0}
            trend={null}
            color="bg-green"
          />
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="cursor-pointer transition-all hover:shadow-lg hover:scale-105" onClick={() => navigate("/admin/alerts?status=pending")}>
          <div className="space-y-2">
            <div className="text-2xl">⚠️</div>
            <h3 className="font-semibold">Review Pending Alerts</h3>
            <p className="text-sm text-slate-600">Manage unassigned alerts</p>
          </div>
        </Card>
        <Card className="cursor-pointer transition-all hover:shadow-lg hover:scale-105" onClick={() => navigate("/admin/volunteers")}>
          <div className="space-y-2">
            <div className="text-2xl">👥</div>
            <h3 className="font-semibold">Manage Volunteers</h3>
            <p className="text-sm text-slate-600">View and manage volunteer profiles</p>
          </div>
        </Card>
        <Card className="cursor-pointer transition-all hover:shadow-lg hover:scale-105" onClick={() => navigate("/admin/leaderboard")}>
          <div className="space-y-2">
            <div className="text-2xl">🏆</div>
            <h3 className="font-semibold">View Leaderboard</h3>
            <p className="text-sm text-slate-600">Top performing volunteers</p>
          </div>
        </Card>
      </div>

      {/* Response Time Info */}
      {stats && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Average Response Time</h3>
              <p className="text-sm text-slate-600 mt-1">System-wide metric</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-blue-600">
                {Math.round(stats.averageResponseTimeMinutes || 0)}
              </p>
              <p className="text-xs text-slate-600 mt-1">minutes</p>
            </div>
          </div>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <div className="space-y-4">
          <h3 className="font-semibold">Recent Completed Alerts</h3>
          {recentAlerts.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentAlerts.map((alert) => (
                <div
                  key={alert._id}
                  className="flex items-center justify-between pb-3 border-b border-slate-200 last:border-b-0"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {alert.tree?.name || "Unknown Tree"}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      By {alert.assignedTo?.user?.fullName || "Unknown Volunteer"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded">
                      ✓ Completed
                    </span>
                    <p className="text-xs text-slate-600 mt-2">
                      {new Date(alert.completedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600">No completed alerts yet</p>
          )}
        </div>
      </Card>
    </div>
  );
}

export default AdminDashboard;
