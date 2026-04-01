import { useEffect, useState } from "react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import FeedbackMessage from "../../components/ui/FeedbackMessage";
import Card from "../../components/ui/Card";
import SectionHeader from "../../components/ui/SectionHeader";

function AdminVolunteersPage() {
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [filters, setFilters] = useState({
    status: "",
    minHours: 0,
    maxHours: 999,
  });

  useEffect(() => {
    fetchVolunteers();
  }, [filters]);

  const fetchVolunteers = async () => {
    try {
      setLoading(true);
      setError("");

      // Since the backend might not have a dedicated volunteers list endpoint,
      // we'll get volunteers from the leaderboard as a workaround
      const res = await fetch("http://localhost:5000/api/alerts/leaderboard?limit=100", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("forisswell_token")}`,  
        },
      });

      if (!res.ok) {
        // If API fails, show empty state instead of error
        setVolunteers([]);
        setError(`${res.status === 404 ? "No volunteer data found" : "Unable to load volunteers"}`);
        return;
      }

      const data = await res.json();
      setVolunteers(data.data?.leaderboard || []);
    } catch (err) {
      // Network error or other issue - show friendly message
      console.error("Fetch error:", err);
      setVolunteers([]);
      setError("Unable to load volunteer data. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleVolunteerClick = (volunteer) => {
    setSelectedVolunteer(volunteer);
    setShowModal(true);
  };

  const handleStatusUpdate = async (volunteerId, newStatus) => {
    try {
      const res = await fetch("http://localhost:5000/api/volunteers/status", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
          isAvailable: newStatus === "available",
        }),
      });

      if (res.ok) {
        fetchVolunteers();
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
        title="Volunteer Directory"
        description="View and manage all volunteer profiles"
      />

      {error && <FeedbackMessage tone="error">{error}</FeedbackMessage>}

      {/* Filters */}
      <Card className="bg-slate-50 border-slate-200">
        <h3 className="font-semibold mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label text-sm">Status</label>
            <select
              className="input text-sm"
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value }))
              }
            >
              <option value="">All Statuses</option>
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="offline">Offline</option>
            </select>
          </div>

          <div>
            <label className="label text-sm">Min Hours</label>
            <input
              type="number"
              className="input text-sm"
              value={filters.minHours}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, minHours: parseInt(e.target.value) }))
              }
              min="0"
            />
          </div>

          <div>
            <label className="label text-sm">Max Hours</label>
            <input
              type="number"
              className="input text-sm"
              value={filters.maxHours}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, maxHours: parseInt(e.target.value) }))
              }
              min="0"
            />
          </div>
        </div>
      </Card>

      {/* Volunteers Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                  Total Alerts
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                  Hours
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                  Completion Rate
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {volunteers.length > 0 ? (
                volunteers
                  .filter(
                    (v) =>
                      (filters.minHours <= (v.totalHours || 0)) &&
                      ((v.totalHours || 0) <= filters.maxHours)
                  )
                  .map((volunteer) => (
                    <tr
                      key={volunteer.volunteerId}
                      className="border-b border-slate-200 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 text-sm text-slate-900 font-medium">
                        {volunteer.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{volunteer.email}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {volunteer.phone || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 font-semibold">
                        {volunteer.completedAlerts || 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 font-semibold">
                        {volunteer.totalHours?.toFixed(1) || 0}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                            (volunteer.completionRate || 0) >= 80
                              ? "bg-green-100 text-green-700"
                              : (volunteer.completionRate || 0) >= 60
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {volunteer.completionRate?.toFixed(1) || 0}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="text-blue-600 hover:text-blue-800 font-semibold"
                          onClick={() => handleVolunteerClick(volunteer)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-4 py-6 text-center text-slate-600">
                    No volunteers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail Modal */}
      {showModal && selectedVolunteer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Volunteer Profile</h2>
              <button
                className="btn-secondary text-sm"
                onClick={() => setShowModal(false)}
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase">Name</p>
                <p className="text-lg font-semibold">{selectedVolunteer.name}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase">Email</p>
                <p className="font-medium">{selectedVolunteer.email}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-600 uppercase">Total Alerts</p>
                  <p className="text-2xl font-bold">{selectedVolunteer.completedAlerts || 0}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-600 uppercase">Total Hours</p>
                  <p className="text-2xl font-bold">
                    {selectedVolunteer.totalHours?.toFixed(1) || 0}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase">Completion Rate</p>
                <p className="text-lg font-semibold">
                  {selectedVolunteer.completionRate?.toFixed(1) || 0}%
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase">
                  Avg Completion Time
                </p>
                <p className="font-medium">
                  {selectedVolunteer.averageCompletionTime?.toFixed(0) || 0} minutes
                </p>
              </div>
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

export default AdminVolunteersPage;
