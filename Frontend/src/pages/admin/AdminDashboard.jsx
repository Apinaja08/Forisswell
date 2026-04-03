import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import FeedbackMessage from "../../components/ui/FeedbackMessage";
import Card from "../../components/ui/Card";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import Badge from "../../components/ui/Badge";

function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [riskStats, setRiskStats] = useState(null);
  const [recentRisks, setRecentRisks] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch alert statistics
      const statsRes = await fetch("http://localhost:5000/api/alerts/statistics", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("forisswell_token")}`,
        },
      });

      if (!statsRes.ok) {
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

      // Fetch risk statistics
      try {
        const riskStatsRes = await fetch("http://localhost:5000/api/risk/stats", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("forisswell_token")}`,
          },
        });

        if (riskStatsRes.ok) {
          const riskStatsData = await riskStatsRes.json();
          setRiskStats(riskStatsData.data);
        }
      } catch (err) {
        console.error("Risk stats error:", err);
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

      // Fetch recent high-risk areas
      try {
        const risksRes = await fetch(
          "http://localhost:5000/api/risk?limit=5&sort=-riskScore",
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("forisswell_token")}`,
            },
          }
        );

        if (risksRes.ok) {
          const risksData = await risksRes.json();
          setRecentRisks(risksData.data || []);
        }
      } catch (err) {
        console.error("Recent risks error:", err);
      }
    } catch (err) {
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

  // Get risk level color
  const getRiskColor = (level) => {
    switch (level) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-green-100 text-green-700 border-green-200';
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

      {/* Alert Stats Grid */}
      {stats && (
        <>
          <h2 className="text-lg font-semibold text-slate-900 mt-4">Alert Statistics</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Alerts"
              value={stats.overview?.total || 0}
              trend={null}
              color="bg-blue"
              onClick={() => navigate("/admin/alerts")}
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
              onClick={() => navigate("/admin/alerts?status=inProgress")}
            />
            <StatCard
              label="Completed"
              value={stats.overview?.completed || 0}
              trend={null}
              color="bg-green"
              onClick={() => navigate("/admin/alerts?status=completed")}
            />
          </div>
        </>
      )}

      {/* Risk Statistics */}
      {riskStats && (
        <>
          <h2 className="text-lg font-semibold text-slate-900 mt-4">Forest Risk Statistics</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Critical Risk Areas"
              value={riskStats.critical || 0}
              trend={null}
              color="bg-red"
              onClick={() => navigate("/risk-analysis?level=critical")}
            />
            <StatCard
              label="High Risk Areas"
              value={riskStats.byLevel?.find(l => l._id === "high")?.count || 0}
              trend={null}
              color="bg-orange"
              onClick={() => navigate("/risk-analysis?level=high")}
            />
            <StatCard
              label="Medium Risk Areas"
              value={riskStats.byLevel?.find(l => l._id === "medium")?.count || 0}
              trend={null}
              color="bg-yellow"
              onClick={() => navigate("/risk-analysis?level=medium")}
            />
            <StatCard
              label="Total Monitored"
              value={riskStats.total || 0}
              trend={null}
              color="bg-green"
              onClick={() => navigate("/risk-analysis")}
            />
          </div>
        </>
      )}

      {/* Quick Actions */}
      <h2 className="text-lg font-semibold text-slate-900 mt-4">Quick Actions</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="cursor-pointer transition-all hover:shadow-lg hover:scale-105" onClick={() => navigate("/admin/alerts?status=pending")}>
          <div className="space-y-2">
            <h3 className="font-semibold">Review Pending Alerts</h3>
            <p className="text-sm text-slate-600">Manage unassigned alerts</p>
          </div>
        </Card>
        
        <Card className="cursor-pointer transition-all hover:shadow-lg hover:scale-105" onClick={() => navigate("/risk-analysis")}>
          <div className="space-y-2 text-center">
            <div className="text-3xl">🌲</div>
            <h3 className="font-semibold">Risk Analysis</h3>
            <p className="text-sm text-slate-600">Monitor forest areas</p>
          </div>
        </Card>
        
        <Card className="cursor-pointer transition-all hover:shadow-lg hover:scale-105" onClick={() => navigate("/admin/volunteers")}>
          <div className="space-y-2">
            <h3 className="font-semibold">Manage Volunteers</h3>
            <p className="text-sm text-slate-600">View and manage volunteer profiles</p>
          </div>
        </Card>
        
        <Card className="cursor-pointer transition-all hover:shadow-lg hover:scale-105" onClick={() => navigate("/admin/leaderboard")}>
          <div className="space-y-2">
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

      {/* Recent High-Risk Areas */}
      {recentRisks.length > 0 && (
        <Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Recent High-Risk Areas</h3>
              <button
                onClick={() => navigate("/risk-analysis")}
                className="text-sm text-green-600 hover:text-green-700"
              >
                View All →
              </button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentRisks.map((risk) => (
                <div
                  key={risk._id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 cursor-pointer transition"
                  onClick={() => navigate(`/risk-analysis/${risk._id}`)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">{risk.name}</p>
                      <Badge variant={risk.riskLevel === 'critical' ? 'error' : risk.riskLevel === 'high' ? 'warning' : 'success'}>
                        {risk.riskLevel.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                      <div>
                        <span className="text-slate-500">Risk Score:</span>
                        <span className="ml-1 font-medium">{risk.riskScore}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Tree Cover:</span>
                        <span className="ml-1 font-medium">{risk.satelliteData?.treeCoverPercentage || 0}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Fire Risk:</span>
                        <span className="ml-1 font-medium">{risk.factors?.fireRisk || 0}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`inline-block px-2 py-1 text-xs font-semibold rounded ${getRiskColor(risk.riskLevel)}`}>
                      Score: {risk.riskScore}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      {new Date(risk.analysisDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Recent Completed Alerts */}
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
                      Completed
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