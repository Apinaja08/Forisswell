import { useEffect, useState } from "react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import FeedbackMessage from "../../components/ui/FeedbackMessage";
import Card from "../../components/ui/Card";
import SectionHeader from "../../components/ui/SectionHeader";

function AdminReportsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch statistics
      const statsRes = await fetch("import.meta.env.VITE_API_BASE_URL/alerts/statistics", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("forisswell_token")}`,  
        },
      });

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data);
      } else {
        setStats(null);
      }

      // Fetch leaderboard
      const leaderboardRes = await fetch(
        "import.meta.env.VITE_API_BASE_URL/alerts/leaderboard?limit=10",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("forisswell_token")}`,  
          },
        }
      );

      if (leaderboardRes.ok) {
        const leaderboardData = await leaderboardRes.json();
        setLeaderboard(leaderboardData.data?.leaderboard || []);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    // CSV export functionality
    const csvContent = [
      ["Alert Status Report"],
      ["Generated", new Date().toISOString()],
      [],
      ["Status", "Count"],
      ["PENDING", stats?.overview?.pending || 0],
      ["ASSIGNED", stats?.overview?.assigned || 0],
      ["IN_PROGRESS", stats?.overview?.inProgress || 0],
      ["COMPLETED", stats?.overview?.completed || 0],
      ["CANCELLED", stats?.overview?.cancelled || 0],
      [],
      ["Volunteer Leaderboard"],
      ["Rank", "Name", "Completed Alerts", "Total Hours", "Completion Rate"],
      ...leaderboard.map((v, i) => [
        i + 1,
        v.name,
        v.completedAlerts || 0,
        v.totalHours?.toFixed(1) || 0,
        v.completionRate?.toFixed(1) || 0,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const element = document.createElement("a");
    element.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent));
    element.setAttribute("download", "forisswell-report.csv");
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <SectionHeader title="Reports & Analytics" description="System-wide insights and trends" />
        <button className="btn-primary" onClick={handleExportCSV}>
          Export CSV
        </button>
      </div>

      {error && <FeedbackMessage tone="error">{error}</FeedbackMessage>}

      {/* Alert Status Distribution */}
      {stats && (
        <Card>
          <h3 className="font-semibold mb-4">Alert Status Distribution</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-200">
              <p className="text-xs font-semibold text-blue-600 uppercase mb-2">Pending</p>
              <p className="text-3xl font-bold text-blue-700">{stats.overview?.pending || 0}</p>
              <p className="text-xs text-blue-600 mt-2">
                {(
                  ((stats.overview?.pending || 0) / (stats.overview?.total || 1)) *
                  100
                ).toFixed(1)}
                %
              </p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4 text-center border border-purple-200">
              <p className="text-xs font-semibold text-purple-600 uppercase mb-2">Assigned</p>
              <p className="text-3xl font-bold text-purple-700">{stats.overview?.assigned || 0}</p>
              <p className="text-xs text-purple-600 mt-2">
                {(
                  ((stats.overview?.assigned || 0) / (stats.overview?.total || 1)) *
                  100
                ).toFixed(1)}
                %
              </p>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4 text-center border border-yellow-200">
              <p className="text-xs font-semibold text-yellow-600 uppercase mb-2">
                In Progress
              </p>
              <p className="text-3xl font-bold text-yellow-700">
                {stats.overview?.inProgress || 0}
              </p>
              <p className="text-xs text-yellow-600 mt-2">
                {(
                  ((stats.overview?.inProgress || 0) / (stats.overview?.total || 1)) *
                  100
                ).toFixed(1)}
                %
              </p>
            </div>

            <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
              <p className="text-xs font-semibold text-green-600 uppercase mb-2">Completed</p>
              <p className="text-3xl font-bold text-green-700">{stats.overview?.completed || 0}</p>
              <p className="text-xs text-green-600 mt-2">
                {(
                  ((stats.overview?.completed || 0) / (stats.overview?.total || 1)) *
                  100
                ).toFixed(1)}
                %
              </p>
            </div>

            <div className="bg-red-50 rounded-lg p-4 text-center border border-red-200">
              <p className="text-xs font-semibold text-red-600 uppercase mb-2">Cancelled</p>
              <p className="text-3xl font-bold text-red-700">{stats.overview?.cancelled || 0}</p>
              <p className="text-xs text-red-600 mt-2">
                {(
                  ((stats.overview?.cancelled || 0) / (stats.overview?.total || 1)) *
                  100
                ).toFixed(1)}
                %
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Priority Distribution */}
      {stats && (
        <Card>
          <h3 className="font-semibold mb-4">Alert Priority Distribution</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Critical", value: stats.overview?.critical || 0, color: "red" },
              { label: "High", value: stats.overview?.high || 0, color: "orange" },
              {
                label: "Medium/Low",
                value: (stats.overview?.total || 0) - (stats.overview?.critical || 0) - (stats.overview?.high || 0),
                color: "yellow",
              },
            ].map((item) => (
              <div
                key={item.label}
                className={`bg-${item.color}-50 rounded-lg p-4 border border-${item.color}-200`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs font-semibold text-${item.color}-600 uppercase`}>
                      {item.label}
                    </p>
                    <p className={`text-3xl font-bold text-${item.color}-700 mt-2`}>
                      {item.value}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl text-${item.color}-600`}>
                      {(((item.value || 0) / (stats.overview?.total || 1)) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Response Time Metrics */}
      {stats && (
        <Card>
          <h3 className="font-semibold mb-4">Response Time Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-6 text-center border border-blue-200">
              <p className="text-sm font-semibold text-blue-600 uppercase mb-2">
                Average Response Time
              </p>
              <p className="text-4xl font-bold text-blue-700">
                {Math.round(stats.averageResponseTimeMinutes || 0)}
              </p>
              <p className="text-xs text-blue-600 mt-2">minutes</p>
            </div>

            <div className="bg-slate-50 rounded-lg p-6 text-center border border-slate-200">
              <p className="text-sm font-semibold text-slate-600 uppercase mb-2">Total Alerts</p>
              <p className="text-4xl font-bold text-slate-700">{stats.overview?.total || 0}</p>
              <p className="text-xs text-slate-600 mt-2">all time</p>
            </div>
          </div>
        </Card>
      )}

      {/* Top Volunteers */}
      {leaderboard.length > 0 && (
        <Card>
          <h3 className="font-semibold mb-4">Top 10 Volunteers</h3>
          <div className="space-y-2">
            {leaderboard.map((volunteer, index) => (
              <div key={volunteer.volunteerId} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-slate-600 w-6 text-right">#{index + 1}</span>
                  <div>
                    <p className="font-semibold text-slate-900">{volunteer.name}</p>
                    <p className="text-xs text-slate-600">{volunteer.email}</p>
                  </div>
                </div>
                <div className="flex gap-6 text-right">
                  <div>
                    <p className="text-xs text-slate-600 uppercase font-semibold mb-1">Alerts</p>
                    <p className="font-bold text-blue-600">{volunteer.completedAlerts || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 uppercase font-semibold mb-1">Hours</p>
                    <p className="font-bold text-green-600">{volunteer.totalHours?.toFixed(1) || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 uppercase font-semibold mb-1">Rate</p>
                    <p className="font-bold text-purple-600">{volunteer.completionRate?.toFixed(0) || 0}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export default AdminReportsPage;
