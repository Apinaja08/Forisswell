import { useEffect, useState } from "react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import FeedbackMessage from "../../components/ui/FeedbackMessage";
import Card from "../../components/ui/Card";
import SectionHeader from "../../components/ui/SectionHeader";

function AdminSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [preferences, setPreferences] = useState({
    dashboardRefreshInterval: 60,
    rowsPerPage: 20,
    timeZone: "UTC",
  });

  useEffect(() => {
    fetchSettings();
    // Load preferences from localStorage
    const saved = localStorage.getItem("adminPreferences");
    if (saved) {
      setPreferences(JSON.parse(saved));
    }
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch system health
      const healthRes = await fetch("import.meta.env.VITE_API_BASE_URL/health");
      if (healthRes.ok) {
        const health = await healthRes.json();
        setSettings({
          health: health.data,
          lastUpdated: new Date().toISOString(),
        });
      }
    } catch (err) {
      // Health endpoint might not be available, continue anyway
    } finally {
      setLoading(false);
    }
  };

  const handleSeedData = async () => {
    if (!window.confirm("This will clear and repopulate all test data. Continue?")) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const token = localStorage.getItem("forisswell_token");  
      const response = await fetch("import.meta.env.VITE_API_BASE_URL/alerts/seed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Database seeded successfully! Created ${data.data.alerts} alerts, ${data.data.volunteers} volunteers, and ${data.data.trees} trees.`);
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setError(data.message || "Failed to seed database");
      }
    } catch (err) {
      setError("Error seeding database: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 p-6">
      <SectionHeader title="System Settings" description="Configure admin preferences and view system info" />

      {error && <FeedbackMessage tone="error">{error}</FeedbackMessage>}
      {success && <FeedbackMessage tone="success">{success}</FeedbackMessage>}

      {/* Admin Preferences */}
      <Card>
        <h3 className="font-semibold mb-4">Admin Preferences</h3>
        <div className="space-y-4">
          <div>
            <label className="label">Dashboard Refresh Interval</label>
            <div className="flex items-center gap-4">
              <select
                className="input"
                value={preferences.dashboardRefreshInterval}
                onChange={(e) =>
                  handlePreferenceChange(
                    "dashboardRefreshInterval",
                    parseInt(e.target.value)
                  )
                }
              >
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
                <option value={300}>5 minutes</option>
                <option value={600}>10 minutes</option>
              </select>
              <p className="text-sm text-slate-600">
                How often dashboard stats update
              </p>
            </div>
          </div>

          <div>
            <label className="label">Rows Per Page in Tables</label>
            <div className="flex items-center gap-4">
              <select
                className="input"
                value={preferences.rowsPerPage}
                onChange={(e) =>
                  handlePreferenceChange("rowsPerPage", parseInt(e.target.value))
                }
              >
                <option value={10}>10 rows</option>
                <option value={20}>20 rows</option>
                <option value={50}>50 rows</option>
              </select>
              <p className="text-sm text-slate-600">Default table pagination</p>
            </div>
          </div>

          <div>
            <label className="label">Time Zone</label>
            <div className="flex items-center gap-4">
              <select
                className="input"
                value={preferences.timeZone}
                onChange={(e) =>
                  handlePreferenceChange("timeZone", e.target.value)
                }
              >
                <option value="UTC">UTC</option>
                <option value="EST">Eastern (EST)</option>
                <option value="CST">Central (CST)</option>
                <option value="PST">Pacific (PST)</option>
              </select>
              <p className="text-sm text-slate-600">
                For displaying timestamps
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Alert Thresholds (Read-only) */}
      <Card className="bg-blue-50 border border-blue-200">
        <h3 className="font-semibold mb-4">Alert Thresholds</h3>
        <p className="text-sm text-slate-600 mb-4">
          Current system thresholds (from backend configuration)
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <p className="text-xs font-semibold text-slate-600 uppercase mb-2">
              Temperature
            </p>
            <p className="text-2xl font-bold text-blue-700">35°C</p>
            <p className="text-xs text-slate-600 mt-2">
              Alerts triggered above this
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <p className="text-xs font-semibold text-slate-600 uppercase mb-2">
              Rainfall
            </p>
            <p className="text-2xl font-bold text-blue-700">50 mm/h</p>
            <p className="text-xs text-slate-600 mt-2">
              Heavy rain threshold
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <p className="text-xs font-semibold text-slate-600 uppercase mb-2">
              Wind Speed
            </p>
            <p className="text-2xl font-bold text-blue-700">40 km/h</p>
            <p className="text-xs text-slate-600 mt-2">
              Strong wind threshold
            </p>
          </div>
        </div>
      </Card>

      {/* Volunteer Matching Settings */}
      <Card className="bg-purple-50 border border-purple-200">
        <h3 className="font-semibold mb-4">Volunteer Matching</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 border border-purple-100">
            <p className="text-xs font-semibold text-slate-600 uppercase mb-2">
              Match Radius
            </p>
            <p className="text-2xl font-bold text-purple-700">5 km</p>
            <p className="text-xs text-slate-600 mt-2">
              Notification distance for volunteers
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-purple-100">
            <p className="text-xs font-semibold text-slate-600 uppercase mb-2">
              Check Interval
            </p>
            <p className="text-2xl font-bold text-purple-700">5 min</p>
            <p className="text-xs text-slate-600 mt-2">
              How often alerts are created
            </p>
          </div>
        </div>
      </Card>

      {/* System Info */}
      {settings && (
        <Card>
          <h3 className="font-semibold mb-4">System Information</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <p className="text-sm text-slate-600">Last Updated</p>
              <p className="font-semibold">
                {new Date(settings.lastUpdated).toLocaleString()}
              </p>
            </div>

            {settings.health && (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <p className="text-sm text-slate-600">Server Status</p>
                  <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                    Running
                  </span>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <p className="text-sm text-slate-600">Database Status</p>
                  <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                    Connected
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-600">Uptime</p>
                  <p className="font-semibold text-slate-900">
                    {Math.floor((settings.health.uptime || 0) / 60)} minutes
                  </p>
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Quick Links */}
      <Card className="bg-slate-50">
        <h3 className="font-semibold mb-4">Quick Links</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="import.meta.env.VITE_API_BASE_URL/health"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 bg-white rounded-lg border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all"
          >
            <div>
              <p className="font-semibold text-slate-900">API Health Check</p>
              <p className="text-xs text-slate-600">Check server status</p>
            </div>
          </a>

          <a
            href="/README.md"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 bg-white rounded-lg border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all"
          >
            <div>
              <p className="font-semibold text-slate-900">API Documentation</p>
              <p className="text-xs text-slate-600">API endpoints & examples</p>
            </div>
          </a>

          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            className="p-3 bg-white rounded-lg border border-slate-200 hover:border-red-400 hover:shadow-md transition-all text-left"
          >
            <div>
              <p className="font-semibold text-slate-900">Clear Cache</p>
              <p className="text-xs text-slate-600">Clear local storage & reload</p>
            </div>
          </button>

          <a
            href="/login"
            className="p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-400 hover:shadow-md transition-all"
          >
            <div>
              <p className="font-semibold text-slate-900">Logout</p>
              <p className="text-xs text-slate-600">Exit admin panel safely</p>
            </div>
          </a>
        </div>
      </Card>

      {/* Seed Test Data */}
      <Card className="bg-green-50 border border-green-200">
        <h3 className="font-semibold mb-4">Seed Test Data (Development)</h3>
        <p className="text-sm text-slate-700 mb-4">
          Populate the database with sample volunteers, trees, and alerts for testing. This is useful for development and testing the admin dashboard.
        </p>
        <button
          onClick={handleSeedData}
          disabled={loading}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-semibold transition-colors"
        >
          {loading ? "Seeding..." : "Seed Database"}
        </button>
        <p className="text-xs text-slate-600 mt-3">
          Warning: This will clear existing data and create 5 volunteers, 15 trees, and 25 alerts.
        </p>
      </Card>

      {/* Support */}
      <Card className="bg-yellow-50 border border-yellow-200">
        <h3 className="font-semibold mb-2">Need Help?</h3>
        <p className="text-sm text-slate-700">
          For issues or questions, check the API documentation or contact the development team.
          System logs are available in the backend.
        </p>
      </Card>
    </div>
  );
}

export default AdminSettingsPage;
