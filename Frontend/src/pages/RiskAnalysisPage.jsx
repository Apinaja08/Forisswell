import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Polygon, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import api from "../services/api";
import LoadingSpinner from "../components/common/LoadingSpinner";
import SectionHeader from "../components/ui/SectionHeader";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import FeedbackMessage from "../components/ui/FeedbackMessage";
import EmptyState from "../components/ui/EmptyState";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

const COLORS = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
  forest: "#15803d",
  deforestation: "#dc2626",
  fire: "#f97316"
};

// Custom component to handle map clicks
function MapClickHandler({ drawing, onMapClick }) {
  useMapEvents({
    click: (e) => {
      if (drawing) {
        onMapClick(e);
      }
    }
  });
  return null;
}

// Custom component to add drawing instructions
function DrawingInstructions({ drawing }) {
  const map = useMap();
  
  useEffect(() => {
    if (drawing) {
      const controlDiv = L.DomUtil.create('div', 'drawing-instructions');
      controlDiv.innerHTML = `
        <div style="background: rgba(0,0,0,0.8); color: white; padding: 8px 12px; border-radius: 4px; font-size: 14px; font-weight: bold;">
          ✏️ Drawing Mode Active - Click on map to add points
        </div>
      `;
      
      const customControl = L.Control.extend({
        onAdd: function() {
          return controlDiv;
        },
        onRemove: function() {}
      });
      
      const control = new customControl({ position: 'topright' });
      control.addTo(map);
      map._drawingControl = control;
      map.getContainer().style.cursor = 'crosshair';
      
      return () => {
        if (map._drawingControl) {
          map.removeControl(map._drawingControl);
          map.getContainer().style.cursor = '';
        }
      };
    } else {
      if (map._drawingControl) {
        map.removeControl(map._drawingControl);
        map.getContainer().style.cursor = '';
      }
    }
  }, [drawing, map]);
  
  return null;
}

// Custom component to display points
function DrawingPoints({ points }) {
  const map = useMap();
  
  useEffect(() => {
    if (!points || points.length === 0) return;
    
    const markers = points.map((point, index) => {
      const marker = L.marker([point[1], point[0]], {
        icon: L.divIcon({
          className: 'drawing-marker',
          html: `<div style="background: #22c55e; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${index + 1}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      }).addTo(map);
      
      marker.bindTooltip(`Point ${index + 1}`, { permanent: false, direction: 'top' });
      return marker;
    });
    
    map._drawingMarkers = markers;
    
    return () => {
      if (map._drawingMarkers) {
        map._drawingMarkers.forEach(marker => marker.remove());
      }
    };
  }, [points, map]);
  
  return null;
}

// Loading Modal Component
const AnalysisLoadingModal = ({ progress, currentStep, stepStatus }) => {
  const steps = [
    { key: "satellite", label: "Fetching Satellite Data", icon: "🛰️" },
    { key: "deforestation", label: "Analyzing Deforestation Patterns", icon: "🌳" },
    { key: "historical", label: "Processing Historical Trends", icon: "📊" },
    { key: "encroachment", label: "Checking Encroachment Risk", icon: "🏠" },
    { key: "settlements", label: "Identifying Nearby Settlements", icon: "📍" },
    { key: "calculating", label: "Calculating Risk Score", icon: "⚡" }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl max-w-md w-full mx-4 p-6 shadow-2xl">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <span className="text-3xl">🌲</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900">Analyzing Area</h3>
          <p className="text-sm text-slate-600 mt-1">{currentStep}</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-slate-600 mb-1">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step) => (
            <div key={step.key} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100">
                <span className="text-sm">{step.icon}</span>
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-700">{step.label}</div>
                <div className="text-xs text-slate-500">
                  {stepStatus[step.key] === "loading" && "Processing..."}
                  {stepStatus[step.key] === "complete" && "✓ Complete"}
                  {stepStatus[step.key] === "pending" && "Waiting..."}
                </div>
              </div>
              {stepStatus[step.key] === "loading" && (
                <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              )}
              {stepStatus[step.key] === "complete" && (
                <span className="text-green-500 text-lg">✓</span>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t text-center">
          <p className="text-xs text-slate-500 animate-pulse">
            This may take 30-60 seconds depending on area size
          </p>
        </div>
      </div>
    </div>
  );
};

const RiskAnalysisPage = () => {
  const [riskAssessments, setRiskAssessments] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    riskLevel: "",
    region: "",
    startDate: "",
    endDate: ""
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0
  });

  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisForm, setAnalysisForm] = useState({
    name: "",
    coordinates: [],
    drawing: false
  });
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [mapCenter, setMapCenter] = useState([20, 0]);
  const [mapZoom, setMapZoom] = useState(2);
  
  // Loading state for analysis
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisCurrentStep, setAnalysisCurrentStep] = useState("");
  const [analysisStepStatus, setAnalysisStepStatus] = useState({
    satellite: "pending",
    deforestation: "pending",
    historical: "pending",
    encroachment: "pending",
    settlements: "pending",
    calculating: "pending"
  });
  const [showLoadingModal, setShowLoadingModal] = useState(false);

  // Fetch risk assessments
  const fetchRiskAssessments = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.riskLevel && { riskLevel: filters.riskLevel }),
        ...(filters.region && { region: filters.region }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      };

      const response = await api.get("/risk", { params });
      
      if (response.data.success) {
        setRiskAssessments(response.data.data);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination?.total || 0,
          pages: response.data.pagination?.pages || 0
        }));
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch risk assessments");
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const response = await api.get("/risk/stats");
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  };

  useEffect(() => {
    fetchRiskAssessments();
    fetchStats();
  }, [pagination.page, filters]);

  // Simulate progress updates
  const updateProgress = (step, progressValue) => {
    setAnalysisCurrentStep(step);
    setAnalysisProgress(progressValue);
    
    // Update step status based on progress
    if (progressValue < 20) {
      setAnalysisStepStatus({
        satellite: progressValue > 5 ? "loading" : "pending",
        deforestation: "pending",
        historical: "pending",
        encroachment: "pending",
        settlements: "pending",
        calculating: "pending"
      });
    } else if (progressValue < 40) {
      setAnalysisStepStatus({
        satellite: "complete",
        deforestation: "loading",
        historical: "pending",
        encroachment: "pending",
        settlements: "pending",
        calculating: "pending"
      });
    } else if (progressValue < 60) {
      setAnalysisStepStatus({
        satellite: "complete",
        deforestation: "complete",
        historical: "loading",
        encroachment: "pending",
        settlements: "pending",
        calculating: "pending"
      });
    } else if (progressValue < 75) {
      setAnalysisStepStatus({
        satellite: "complete",
        deforestation: "complete",
        historical: "complete",
        encroachment: "loading",
        settlements: "pending",
        calculating: "pending"
      });
    } else if (progressValue < 90) {
      setAnalysisStepStatus({
        satellite: "complete",
        deforestation: "complete",
        historical: "complete",
        encroachment: "complete",
        settlements: "loading",
        calculating: "pending"
      });
    } else {
      setAnalysisStepStatus({
        satellite: "complete",
        deforestation: "complete",
        historical: "complete",
        encroachment: "complete",
        settlements: "complete",
        calculating: "loading"
      });
    }
  };

  // Handle risk analysis with progress simulation
  const handleAnalyzeRisk = async () => {
    if (!analysisForm.name || analysisForm.coordinates.length < 4) {
      setError("Please provide a name and draw a valid polygon on the map (minimum 3 points, and polygon must be closed)");
      return;
    }

    setAnalysisLoading(true);
    setShowLoadingModal(true);
    setError("");
    setAnalysisProgress(0);
    updateProgress("Initializing...", 0);
    
    // Start progress simulation
    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return prev;
        }
        return Math.min(prev + 5, 95);
      });
    }, 3000);
    
    try {
      const polygon = {
        name: analysisForm.name,
        coordinates: [analysisForm.coordinates],
        type: "Polygon"
      };
      
      updateProgress("Fetching satellite data...", 10);
      
      const response = await api.post("/risk/analyze", { polygon });
      
      clearInterval(progressInterval);
      setAnalysisProgress(100);
      updateProgress("Analysis complete!", 100);
      
      // Brief delay to show 100% completion
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (response.data.success) {
        setAnalysisResult(response.data.data);
        setShowLoadingModal(false);
        setShowAnalysisModal(false);
        await fetchRiskAssessments();
        await fetchStats();
        
        // Auto-show the result modal
        setSelectedRisk(response.data.data);
      } else {
        setError(response.data.error || "Analysis failed");
        setShowLoadingModal(false);
      }
    } catch (err) {
      clearInterval(progressInterval);
      setError(err.response?.data?.error || "Failed to analyze area");
      setShowLoadingModal(false);
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Draw polygon on map
  const handleMapClick = (e) => {
    if (!analysisForm.drawing) return;
    
    const { lat, lng } = e.latlng;
    setAnalysisForm(prev => ({
      ...prev,
      coordinates: [...prev.coordinates, [lng, lat]]
    }));
  };

  const completePolygon = () => {
    if (analysisForm.coordinates.length >= 3) {
      const closedCoordinates = [...analysisForm.coordinates, analysisForm.coordinates[0]];
      setAnalysisForm(prev => ({
        ...prev,
        drawing: false,
        coordinates: closedCoordinates
      }));
    } else {
      setError("Need at least 3 points to complete a polygon");
    }
  };

  const clearPolygon = () => {
    setAnalysisForm(prev => ({
      ...prev,
      coordinates: [],
      drawing: false
    }));
    setError("");
  };

  const startDrawing = () => {
    clearPolygon();
    setAnalysisForm(prev => ({ ...prev, drawing: true }));
    setError("");
  };

  // Get risk level color and badge
  const getRiskConfig = (level) => {
    const config = {
      critical: { color: "text-red-700", bg: "bg-red-50", badge: "error", label: "CRITICAL" },
      high: { color: "text-orange-700", bg: "bg-orange-50", badge: "warning", label: "HIGH" },
      medium: { color: "text-yellow-700", bg: "bg-yellow-50", badge: "warning", label: "MEDIUM" },
      low: { color: "text-green-700", bg: "bg-green-50", badge: "success", label: "LOW" }
    };
    return config[level] || config.low;
  };

  // Prepare chart data
  const riskDistributionData = stats?.byLevel?.map(item => ({
    name: item._id.toUpperCase(),
    value: item.count,
    color: COLORS[item._id]
  })) || [];

  return (
    <div className="space-y-6">
      {/* Loading Modal */}
      {showLoadingModal && (
        <AnalysisLoadingModal 
          progress={analysisProgress}
          currentStep={analysisCurrentStep}
          stepStatus={analysisStepStatus}
        />
      )}

      {/* Header */}
      <Card className="border-green-100 bg-gradient-to-r from-green-50 to-emerald-50">
        <SectionHeader
          title="Forest Risk Analysis Dashboard"
          subtitle="Monitor deforestation, fire risk, and encroachment in forest areas"
          right={
            <button
              onClick={() => {
                setShowAnalysisModal(true);
                setAnalysisResult(null);
                clearPolygon();
              }}
              className="btn-primary flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Analysis
            </button>
          }
        />
      </Card>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Critical Risk Areas</p>
                <p className="text-2xl font-bold text-red-600">{stats.critical || 0}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
            </div>
          </Card>
          
          <Card className="border-l-4 border-l-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">High Risk Areas</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.byLevel?.find(l => l._id === "high")?.count || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🔥</span>
              </div>
            </div>
          </Card>
          
          <Card className="border-l-4 border-l-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Monitored</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.total || 0}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🌳</span>
              </div>
            </div>
          </Card>
          
          <Card className="border-l-4 border-l-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Critical Percentage</p>
                <p className="text-2xl font-bold text-green-600">{stats.criticalPercentage}%</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      {riskDistributionData.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Risk Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={riskDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {riskDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Risk Factors Overview</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Tree Cover Loss</span>
                <div className="flex-1 mx-4">
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: "35%" }} />
                  </div>
                </div>
                <span className="text-sm font-medium">35% weight</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Degradation Rate</span>
                <div className="flex-1 mx-4">
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: "20%" }} />
                  </div>
                </div>
                <span className="text-sm font-medium">20% weight</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Fire Risk</span>
                <div className="flex-1 mx-4">
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-500 rounded-full" style={{ width: "20%" }} />
                  </div>
                </div>
                <span className="text-sm font-medium">20% weight</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Encroachment Risk</span>
                <div className="flex-1 mx-4">
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: "15%" }} />
                  </div>
                </div>
                <span className="text-sm font-medium">15% weight</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Illegal Logging</span>
                <div className="flex-1 mx-4">
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: "10%" }} />
                  </div>
                </div>
                <span className="text-sm font-medium">10% weight</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <div className="space-y-4">
          <h3 className="text-md font-semibold text-slate-900">Filters</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="label" htmlFor="risk-level">Risk Level</label>
              <select
                id="risk-level"
                className="input"
                value={filters.riskLevel}
                onChange={(e) => setFilters(prev => ({ ...prev, riskLevel: e.target.value, page: 1 }))}
              >
                <option value="">All Levels</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="label" htmlFor="region">Region</label>
              <input
                id="region"
                className="input"
                placeholder="e.g., Amazon"
                value={filters.region}
                onChange={(e) => setFilters(prev => ({ ...prev, region: e.target.value, page: 1 }))}
              />
            </div>

            <div>
              <label className="label" htmlFor="start-date">From Date</label>
              <input
                id="start-date"
                type="date"
                className="input"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value, page: 1 }))}
              />
            </div>

            <div>
              <label className="label" htmlFor="end-date">To Date</label>
              <input
                id="end-date"
                type="date"
                className="input"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value, page: 1 }))}
              />
            </div>
          </div>

          {(filters.riskLevel || filters.region || filters.startDate || filters.endDate) && (
            <div className="flex justify-end">
              <button
                className="btn-secondary text-sm"
                onClick={() => {
                  setFilters({ riskLevel: "", region: "", startDate: "", endDate: "" });
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Risk Assessments Grid */}
      {loading && <LoadingSpinner label="Loading risk assessments..." />}
      
      {error && (
        <FeedbackMessage tone="error" onDismiss={() => setError("")}>
          {error}
        </FeedbackMessage>
      )}

      {!loading && !error && riskAssessments.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {riskAssessments.map((risk) => {
            const riskConfig = getRiskConfig(risk.riskLevel);
            
            return (
              <Card
                key={risk._id}
                className={`cursor-pointer transition hover:-translate-y-0.5 hover:shadow-card border-l-4 ${
                  risk.riskLevel === "critical" ? "border-l-red-500" :
                  risk.riskLevel === "high" ? "border-l-orange-500" :
                  risk.riskLevel === "medium" ? "border-l-yellow-500" :
                  "border-l-green-500"
                }`}
                onClick={() => setSelectedRisk(risk)}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900">{risk.name}</h3>
                      <div className="mt-1">
                        <Badge variant={riskConfig.badge}>{riskConfig.label}</Badge>
                      </div>
                    </div>
                    <div className="text-2xl font-bold" style={{ color: COLORS[risk.riskLevel] }}>
                      {risk.riskScore}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500">🌳 Tree Cover:</span>
                      <span className="font-medium">{risk.satelliteData?.treeCoverPercentage || 0}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500">🔥 Fire Risk:</span>
                      <span className="font-medium">{risk.factors?.fireRisk || 0}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500">📉 Deforestation:</span>
                      <span className="font-medium">{risk.factors?.treeCoverLoss || 0}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500">🏠 Encroachment:</span>
                      <span className="font-medium">{risk.factors?.encroachmentRisk || 0}%</span>
                    </div>
                  </div>

                  {risk.actions?.length > 0 && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <span>⚠️ {risk.actions.length} action(s) required</span>
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-slate-400">
                    Analyzed: {new Date(risk.analysisDate).toLocaleDateString()}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && !error && riskAssessments.length === 0 && (
        <EmptyState
          title="No risk assessments found"
          description={
            filters.riskLevel || filters.region || filters.startDate || filters.endDate
              ? "Try adjusting your filters to see more assessments."
              : "No areas have been analyzed yet. Click 'New Analysis' to start monitoring forest areas."
          }
          actionLabel="Start New Analysis"
          actionTo="#"
          onAction={() => {
            setShowAnalysisModal(true);
            setAnalysisResult(null);
            clearPolygon();
          }}
        />
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Showing {riskAssessments.length} of {pagination.total} assessments
          </div>
          <div className="flex items-center gap-2">
            <button
              className="btn-secondary"
              onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={pagination.page === 1}
            >
              Previous
            </button>
            <span className="chip">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              className="btn-secondary"
              onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
              disabled={pagination.page === pagination.pages}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Analysis Modal */}
      {showAnalysisModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-900">New Risk Analysis</h2>
                <button
                  onClick={() => setShowAnalysisModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              {analysisResult ? (
                // Analysis Results View
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg ${
                    analysisResult.riskLevel === "critical" ? "bg-red-50" :
                    analysisResult.riskLevel === "high" ? "bg-orange-50" :
                    analysisResult.riskLevel === "medium" ? "bg-yellow-50" :
                    "bg-green-50"
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold">{analysisResult.name}</h3>
                        <Badge variant={getRiskConfig(analysisResult.riskLevel).badge}>
                          {analysisResult.riskLevel.toUpperCase()} RISK
                        </Badge>
                      </div>
                      <div className="text-center">
                        <div className="text-4xl font-bold">{analysisResult.riskScore}</div>
                        <div className="text-sm text-slate-600">Risk Score</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-2">Risk Factors</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Tree Cover Loss</span>
                          <span className="font-medium">{analysisResult.factors?.treeCoverLoss}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Degradation Rate</span>
                          <span className="font-medium">{analysisResult.factors?.degradationRate}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Fire Risk</span>
                          <span className="font-medium">{analysisResult.factors?.fireRisk}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Encroachment Risk</span>
                          <span className="font-medium">{analysisResult.factors?.encroachmentRisk}%</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-2">Actions Required</h4>
                      <div className="space-y-2">
                        {analysisResult.actions?.map((action, idx) => (
                          <div key={idx} className="flex items-start gap-2 p-2 bg-slate-50 rounded">
                            <span className="text-lg">⚠️</span>
                            <div>
                              <div className="font-medium">{action.type}</div>
                              <div className="text-sm text-slate-600">{action.notes}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowAnalysisModal(false);
                        setAnalysisResult(null);
                        clearPolygon();
                      }}
                      className="btn-primary flex-1"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        setAnalysisResult(null);
                        clearPolygon();
                      }}
                      className="btn-secondary flex-1"
                    >
                      New Analysis
                    </button>
                  </div>
                </div>
              ) : (
                // Analysis Form
                <div className="space-y-4">
                  <div>
                    <label className="label" htmlFor="area-name">Area Name *</label>
                    <input
                      id="area-name"
                      className="input"
                      placeholder="e.g., Amazon Sector 7"
                      value={analysisForm.name}
                      onChange={(e) => setAnalysisForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="label">Draw Polygon on Map</label>
                    <div className="border rounded-lg overflow-hidden" style={{ height: "500px" }}>
                      <MapContainer
                        center={mapCenter}
                        zoom={mapZoom}
                        style={{ height: "100%", width: "100%" }}
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        />
                        <MapClickHandler 
                          drawing={analysisForm.drawing} 
                          onMapClick={handleMapClick}
                        />
                        <DrawingInstructions drawing={analysisForm.drawing} />
                        <DrawingPoints points={analysisForm.coordinates} />
                        {analysisForm.coordinates.length > 0 && (
                          <Polygon
                            positions={analysisForm.coordinates.map(coord => [coord[1], coord[0]])}
                            pathOptions={{ color: "#22c55e", weight: 3, fillColor: "#22c55e", fillOpacity: 0.2 }}
                          />
                        )}
                      </MapContainer>
                    </div>
                    
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {!analysisForm.drawing && analysisForm.coordinates.length === 0 && (
                        <button
                          type="button"
                          onClick={startDrawing}
                          className="btn-primary"
                        >
                          ✏️ Start Drawing
                        </button>
                      )}
                      {analysisForm.drawing && (
                        <>
                          <button
                            type="button"
                            onClick={() => setAnalysisForm(prev => ({ ...prev, drawing: false }))}
                            className="btn-secondary"
                          >
                            Cancel Drawing
                          </button>
                          <button
                            type="button"
                            onClick={completePolygon}
                            disabled={analysisForm.coordinates.length < 3}
                            className={`btn-primary ${analysisForm.coordinates.length < 3 ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            ✓ Complete Polygon
                          </button>
                        </>
                      )}
                      {analysisForm.coordinates.length > 0 && !analysisForm.drawing && (
                        <>
                          <button
                            type="button"
                            onClick={startDrawing}
                            className="btn-secondary"
                          >
                            ✏️ Continue Drawing
                          </button>
                          <button
                            type="button"
                            onClick={clearPolygon}
                            className="btn-secondary text-red-600 hover:text-red-700"
                          >
                            🗑️ Clear Polygon
                          </button>
                        </>
                      )}
                    </div>
                    
                    {analysisForm.coordinates.length > 0 && (
                      <div className="mt-2 p-3 bg-slate-50 rounded-lg">
                        <div className="text-sm font-medium text-slate-700 mb-1">
                          Polygon Points: {analysisForm.coordinates.length - (analysisForm.coordinates.length > 3 && analysisForm.coordinates[analysisForm.coordinates.length - 1] === analysisForm.coordinates[0] ? 1 : 0)} points
                        </div>
                        <div className="text-xs text-slate-500">
                          {analysisForm.coordinates.length >= 3 ? 
                            "✓ Ready for analysis" : 
                            `Need ${3 - analysisForm.coordinates.length} more point(s) to create a valid polygon`}
                        </div>
                        {analysisForm.drawing && (
                          <div className="text-xs text-blue-600 mt-1">
                            💡 Click on the map to add points. Press "Complete Polygon" when done.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {analysisForm.coordinates.length >= 3 && (
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleAnalyzeRisk}
                        disabled={analysisLoading}
                        className="btn-primary flex-1"
                      >
                        {analysisLoading ? "Analyzing..." : "Analyze Risk"}
                      </button>
                      <button
                        onClick={() => setShowAnalysisModal(false)}
                        className="btn-secondary flex-1"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Risk Details Modal */}
      {selectedRisk && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{selectedRisk.name}</h2>
                  <div className="mt-1">
                    <Badge variant={getRiskConfig(selectedRisk.riskLevel).badge}>
                      {selectedRisk.riskLevel.toUpperCase()} RISK
                    </Badge>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRisk(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Risk Factors</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Tree Cover Loss</span>
                        <span className="font-medium">{selectedRisk.factors?.treeCoverLoss}%</span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${selectedRisk.factors?.treeCoverLoss}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Degradation Rate</span>
                        <span className="font-medium">{selectedRisk.factors?.degradationRate}%</span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500 rounded-full" style={{ width: `${selectedRisk.factors?.degradationRate}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Fire Risk</span>
                        <span className="font-medium">{selectedRisk.factors?.fireRisk}%</span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${selectedRisk.factors?.fireRisk}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Encroachment Risk</span>
                        <span className="font-medium">{selectedRisk.factors?.encroachmentRisk}%</span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${selectedRisk.factors?.encroachmentRisk}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Satellite Data</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Tree Cover Percentage</span>
                      <span className="font-medium">{selectedRisk.satelliteData?.treeCoverPercentage}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Change Detected</span>
                      <span className="font-medium">{selectedRisk.satelliteData?.changeDetected ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Confidence</span>
                      <span className="font-medium">{selectedRisk.satelliteData?.confidence}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Data Source</span>
                      <span className="font-medium">{selectedRisk.satelliteData?.source}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Imagery Date</span>
                      <span className="font-medium">{new Date(selectedRisk.satelliteData?.imageryDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedRisk.actions?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Required Actions</h3>
                  <div className="space-y-2">
                    {selectedRisk.actions.map((action, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                          <span className="text-red-600">⚠️</span>
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold capitalize">{action.type}</div>
                          <div className="text-sm text-slate-600">{action.notes}</div>
                          <div className="text-xs text-slate-400 mt-1">
                            Triggered: {new Date(action.triggeredAt).toLocaleString()}
                          </div>
                        </div>
                        <Badge variant="warning">{action.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="grid gap-2 text-sm text-slate-600">
                  <div>Region: {selectedRisk.metadata?.region || "Unknown"}</div>
                  <div>Analyzed: {new Date(selectedRisk.analysisDate).toLocaleString()}</div>
                  <div>Tags: {selectedRisk.metadata?.tags?.join(", ") || "None"}</div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setSelectedRisk(null)} className="btn-primary flex-1">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskAnalysisPage;