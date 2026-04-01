import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import FeedbackMessage from "../../components/ui/FeedbackMessage";
import Card from "../../components/ui/Card";
import SectionHeader from "../../components/ui/SectionHeader";

function AdminAlertsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [filters, setFilters] = useState({
    status: searchParams.get("status") || "",
    priority: searchParams.get("priority") || "",
    type: searchParams.get("type") || "",
    dateFrom: "",
    dateTo: "",
  });

  useEffect(() => {
    fetchAlerts();
  }, [filters, page]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page,
        limit,
        ...(filters.status && { status: filters.status }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.type && { type: filters.type }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
      });

      const res = await fetch(`http://localhost:5000/api/alerts?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("forisswell_token")}`,  
        },
      });

      if (!res.ok) {
        setAlerts([]);
        console.error("API error:", res.status);
        return;
      }
      const data = await res.json();
      setAlerts(data.data?.alerts || []);
    } catch (err) {
      console.error("Fetch error:", err);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleAlertClick = async (alertId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/alerts/${alertId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("forisswell_token")}`,  
        },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedAlert(data.data);
        setShowModal(true);
      }
    } catch (err) {
      console.error("Error fetching alert details:", err);
    }
  };

  const handleCancelAlert = async (alertId) => {
    try {
      const reason = prompt("Enter reason for cancellation:");
      if (!reason) return;

      const res = await fetch(`http://localhost:5000/api/alerts/${alertId}/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("forisswell_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      });

      if (res.ok) {
        fetchAlerts();
        setShowModal(false);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 p-6">
      <SectionHeader
        title="Alerts Management"
        description="View and manage all system alerts"
      />

      {error && <FeedbackMessage tone="error">{error}</FeedbackMessage>}

      {/* Filters */}
      <Card className="bg-slate-50 border-slate-200">
        <h3 className="font-semibold mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="label text-sm">Status</label>
            <select
              className="input text-sm"
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="label text-sm">Priority</label>
            <select
              className="input text-sm"
              value={filters.priority}
              onChange={(e) => handleFilterChange("priority", e.target.value)}
            >
              <option value="">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label className="label text-sm">Type</label>
            <select
              className="input text-sm"
              value={filters.type}
              onChange={(e) => handleFilterChange("type", e.target.value)}
            >
              <option value="">All Types</option>
              <option value="high_temperature">High Temperature</option>
              <option value="heavy_rain">Heavy Rain</option>
              <option value="strong_wind">Strong Wind</option>
              <option value="multiple_threats">Multiple Threats</option>
            </select>
          </div>

          <div>
            <label className="label text-sm">From Date</label>
            <input
              type="date"
              className="input text-sm"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
            />
          </div>

          <div>
            <label className="label text-sm">To Date</label>
            <input
              type="date"
              className="input text-sm"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange("dateTo", e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Alerts Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Tree</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Volunteer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Created</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {alerts.length > 0 ? (
                alerts.map((alert) => (
                  <tr
                    key={alert._id}
                    className="border-b border-slate-200 hover:bg-slate-50 cursor-pointer"
                    onClick={() => handleAlertClick(alert._id)}
                  >
                    <td className="px-4 py-3 text-sm text-slate-900 font-mono">
                      {alert._id?.substring(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      {alert.tree?.name || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {alert.type?.replace(/_/g, " ") || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                          alert.priority === "critical"
                            ? "bg-red-100 text-red-700"
                            : alert.priority === "high"
                            ? "bg-orange-100 text-orange-700"
                            : alert.priority === "medium"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {alert.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                          alert.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : alert.status === "in_progress"
                            ? "bg-blue-100 text-blue-700"
                            : alert.status === "assigned"
                            ? "bg-purple-100 text-purple-700"
                            : alert.status === "cancelled"
                            ? "bg-red-100 text-red-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {alert.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {alert.assignedTo?.user?.fullName || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {new Date(alert.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                      {alert.status === "pending" && (
                        <button
                          className="text-red-600 hover:text-red-800 text-xs font-semibold"
                          onClick={() => handleCancelAlert(alert._id)}
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="px-4 py-6 text-center text-slate-600">
                    No alerts found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
          <p className="text-sm text-slate-600">
            Page {page} | Showing {alerts.length} alerts
          </p>
          <div className="flex gap-2">
            <button
              className="btn-secondary text-sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <button className="btn-secondary text-sm" onClick={() => setPage(page + 1)}>
              Next
            </button>
          </div>
        </div>
      </Card>

      {/* Detail Modal */}
      {showModal && selectedAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Alert Details</h2>
              <button
                className="btn-secondary text-sm"
                onClick={() => setShowModal(false)}
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase">Tree</p>
                <p className="text-lg font-semibold">{selectedAlert.tree?.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-600 uppercase">Type</p>
                  <p className="font-medium">{selectedAlert.type?.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-600 uppercase">Priority</p>
                  <p className="font-medium">{selectedAlert.priority}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase">Weather Data</p>
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                  <p>Temperature: {selectedAlert.weatherData?.temperature}°C</p>
                  <p>Humidity: {selectedAlert.weatherData?.humidity}%</p>
                  <p>Rainfall: {selectedAlert.weatherData?.rainfall}mm</p>
                  <p>Wind: {selectedAlert.weatherData?.windSpeed}km/h</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase">Status</p>
                <p className="font-medium">{selectedAlert.status}</p>
              </div>

              {selectedAlert.assignedTo && (
                <div>
                  <p className="text-xs font-semibold text-slate-600 uppercase">Assigned To</p>
                  <p className="font-medium">{selectedAlert.assignedTo?.user?.fullName}</p>
                </div>
              )}

              {selectedAlert.volunteerNotes && (
                <div>
                  <p className="text-xs font-semibold text-slate-600 uppercase">Notes</p>
                  <p className="text-sm">{selectedAlert.volunteerNotes}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6 justify-end">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                Close
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default AdminAlertsPage;
