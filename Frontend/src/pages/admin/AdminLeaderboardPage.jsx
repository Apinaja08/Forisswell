import { useEffect, useState } from "react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import FeedbackMessage from "../../components/ui/FeedbackMessage";
import Card from "../../components/ui/Card";
import SectionHeader from "../../components/ui/SectionHeader";
import Badge from "../../components/ui/Badge";

function AdminLeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState("completedAlerts");

  useEffect(() => {
    fetchLeaderboard();
  }, [limit, sortBy]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError("");

      const sortMap = {
        completedAlerts: "completedAlerts",
        totalHours: "totalHours",
        completionRate: "completionRate",
      };

      const res = await fetch(
        `http://localhost:5000/api/alerts/leaderboard?limit=${limit}&sort=${sortMap[sortBy]}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("forisswell_token")}`,  
          },
        }
      );

      if (!res.ok) {
        setLeaderboard([]);
        return;
      }
      const data = await res.json();
      setLeaderboard(data.data?.leaderboard || []);
    } catch (err) {
      console.error("Fetch error:", err);
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  const getMedalIcon = (rank) => {
    switch (rank) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return null;
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 p-6">
      <SectionHeader
        title="Volunteer Leaderboard"
        description="Top performing volunteers"
      />

      {error && <FeedbackMessage tone="error">{error}</FeedbackMessage>}

      {/* Controls */}
      <Card className="bg-slate-50 border-slate-200">
        <div className="flex flex-col md:flex-row gap-6">
          <div>
            <label className="label text-sm font-semibold">Show Top</label>
            <div className="flex gap-2 mt-2">
              {[10, 20, 50].map((value) => (
                <button
                  key={value}
                  className={`px-4 py-2 rounded font-medium text-sm transition-colors ${
                    limit === value
                      ? "bg-blue-600 text-white"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                  onClick={() => setLimit(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label text-sm font-semibold">Sort By</label>
            <select
              className="input text-sm mt-2"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="completedAlerts">Completed Alerts</option>
              <option value="totalHours">Total Hours</option>
              <option value="completionRate">Completion Rate</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Leaderboard */}
      <Card>
        <div className="space-y-2">
          {leaderboard.length > 0 ? (
            leaderboard.map((volunteer, index) => (
              <div
                key={volunteer.volunteerId}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-transparent rounded-lg border border-slate-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-200 font-bold text-lg">
                    {getMedalIcon(index + 1) || (
                      <span className="text-sm text-slate-600">#{index + 1}</span>
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{volunteer.name}</p>
                    <p className="text-xs text-slate-600">{volunteer.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-xs font-semibold text-slate-600 uppercase mb-1">
                      Alerts
                    </p>
                    <p className="text-lg font-bold text-blue-600">
                      {volunteer.completedAlerts || 0}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-xs font-semibold text-slate-600 uppercase mb-1">Hours</p>
                    <p className="text-lg font-bold text-green-600">
                      {volunteer.totalHours?.toFixed(1) || 0}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-xs font-semibold text-slate-600 uppercase mb-1">Rate</p>
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${
                        (volunteer.completionRate || 0) >= 80
                          ? "bg-green-100 text-green-700"
                          : (volunteer.completionRate || 0) >= 60
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {volunteer.completionRate?.toFixed(0) || 0}%
                    </span>
                  </div>

                  <div className="text-center">
                    <p className="text-xs font-semibold text-slate-600 uppercase mb-1">Avg Time</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {volunteer.averageCompletionTime?.toFixed(0) || 0}m
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-600">No volunteers in leaderboard</div>
          )}
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <p className="text-xs font-semibold text-slate-600 uppercase mb-2">
            Total Volunteers
          </p>
          <p className="text-3xl font-bold text-blue-600">{leaderboard.length}</p>
        </Card>

        {leaderboard.length > 0 && (
          <>
            <Card>
              <p className="text-xs font-semibold text-slate-600 uppercase mb-2">
                Avg Completion Rate
              </p>
              <p className="text-3xl font-bold text-green-600">
                {(
                  leaderboard.reduce((sum, v) => sum + (v.completionRate || 0), 0) /
                  leaderboard.length
                ).toFixed(1)}
                %
              </p>
            </Card>

            <Card>
              <p className="text-xs font-semibold text-slate-600 uppercase mb-2">
                Total Hours Contributed
              </p>
              <p className="text-3xl font-bold text-purple-600">
                {leaderboard
                  .reduce((sum, v) => sum + (v.totalHours || 0), 0)
                  .toFixed(1)}
              </p>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

export default AdminLeaderboardPage;
