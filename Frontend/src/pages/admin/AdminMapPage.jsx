import { useEffect, useState } from "react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import FeedbackMessage from "../../components/ui/FeedbackMessage";
import Card from "../../components/ui/Card";
import SectionHeader from "../../components/ui/SectionHeader";

function AdminMapPage() {
  const [mapData, setMapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    status: "",
    priority: "",
  });

  useEffect(() => {
    fetchMapData();
  }, [filters]);

  const fetchMapData = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        ...(filters.status && { status: filters.status }),
        ...(filters.priority && { priority: filters.priority }),
      });

      const res = await fetch(`http://localhost:5000/api/alerts/map?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("forisswell_token")}`,  
        },
      });

      if (!res.ok) {
        setMapData([]);
        return;
      }
      const data = await res.json();
      setMapData(data.data?.markers || []);
    } catch (err) {
      console.error("Fetch error:", err);
      setMapData([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 p-6">
      <SectionHeader
        title="Geospatial Alert Map"
        description="View alert locations on interactive map"
      />

      {error && <FeedbackMessage tone="error">{error}</FeedbackMessage>}

      {/* Filters */}
      <Card className="bg-slate-50 border-slate-200">
        <h3 className="font-semibold mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label text-sm">Status</label>
            <select
              className="input text-sm"
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label className="label text-sm">Priority</label>
            <select
              className="input text-sm"
              value={filters.priority}
              onChange={(e) => setFilters((prev) => ({ ...prev, priority: e.target.value }))}
            >
              <option value="">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Map Placeholder - For production, integrate with Leaflet/react-leaflet */}
      <Card>
        <div className="h-96 bg-gradient-to-br from-blue-50 to-slate-50 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-200">
          <div className="text-center">
            <p className="font-semibold text-slate-900">Interactive Map</p>
            <p className="text-sm text-slate-600 mt-1">
              Install leaflet and react-leaflet to visualize alerts on map
            </p>
            <p className="text-xs text-slate-500 mt-4">
              Run: npm install leaflet react-leaflet
            </p>
          </div>
        </div>
      </Card>

      {/* Alerts List */}
      <Card>
        <h3 className="font-semibold mb-4">Alert Markers ({mapData.length})</h3>
        {mapData.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {mapData.map((marker) => (
              <div
                key={marker.id}
                className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{marker.treeName || "Alert"}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Coordinates: {marker.coordinates[1]?.toFixed(4)}, {marker.coordinates[0]?.toFixed(4)}
                    </p>
                    <p className="text-xs text-slate-600 mt-2">
                      Type: {marker.type?.replace(/_/g, " ")} | Priority:{" "}
                      <span
                        className={
                          marker.priority === "critical"
                            ? "text-red-600"
                            : marker.priority === "high"
                            ? "text-orange-600"
                            : marker.priority === "medium"
                            ? "text-yellow-600"
                            : "text-green-600"
                        }
                      >
                        {marker.priority}
                      </span>
                    </p>
                  </div>
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                      marker.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : marker.status === "in_progress"
                        ? "bg-blue-100 text-blue-700"
                        : marker.status === "assigned"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {marker.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-slate-600 py-6">No alerts to display on map</p>
        )}
      </Card>

      {/* Legend */}
      <Card className="bg-slate-50">
        <h3 className="font-semibold mb-3">Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="font-semibold">Priority Levels</p>
            <div className="mt-2 space-y-1">
              <p className="text-red-600">Critical</p>
              <p className="text-orange-600">High</p>
              <p className="text-yellow-600">Medium</p>
              <p className="text-green-600">Low</p>
            </div>
          </div>
          <div>
            <p className="font-semibold">Status Markers</p>
            <div className="mt-2 space-y-1">
              <p>Pending</p>
              <p>Assigned</p>
              <p>In Progress</p>
              <p>Completed</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default AdminMapPage;
