import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polygon, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import LoadingSpinner from "../components/common/LoadingSpinner";
import SectionHeader from "../components/ui/SectionHeader";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import FeedbackMessage from "../components/ui/FeedbackMessage";
import EmptyState from "../components/ui/EmptyState";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
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

function MapViewportController({ center, zoom }) {
  const map = useMap();

  useEffect(() => {
    if (Array.isArray(center) && center.length === 2) {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, zoom, map]);

  return null;
}

function CurrentLocationMarker({ location }) {
  const map = useMap();

  useEffect(() => {
    if (!location) return;

    const marker = L.circleMarker(location, {
      radius: 8,
      color: "#2563eb",
      fillColor: "#60a5fa",
      fillOpacity: 0.95,
      weight: 2
    }).addTo(map);

    marker.bindTooltip("Current location", { direction: "top" });

    return () => {
      marker.remove();
    };
  }, [location, map]);

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
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  
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

  // Edit/Delete states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRisk, setEditingRisk] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    riskLevel: "",
    riskScore: "",
    notes: ""
  });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Event organization states
  const [showOrganizeEventModal, setShowOrganizeEventModal] = useState(false);
  const [organizeEventData, setOrganizeEventData] = useState(null);
  const [eventFormData, setEventFormData] = useState({
    title: "",
    description: "",
    eventType: "tree_planting",
    startDate: "",
    endDate: "",
    location: {
      address: "",
      city: "",
      coordinates: { lat: "", lng: "" }
    },
    maxParticipants: 50,
    tags: [],
    reminders: true
  });
  const [eventFormLoading, setEventFormLoading] = useState(false);
  const [eventFormError, setEventFormError] = useState("");
  const [eventFormSuccess, setEventFormSuccess] = useState("");
  const [eventTagInput, setEventTagInput] = useState("");

  // Use auth context instead of direct localStorage reads
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isLoggedIn = !!(user?._id || user?.id);

  // Helper function to get polygon centroid
  const getPolygonCentroid = (coordinates) => {
    if (!coordinates || coordinates.length === 0) return null;
    
    const ring = coordinates[0] || coordinates;
    let sumLat = 0;
    let sumLng = 0;
    
    ring.forEach(coord => {
      sumLng += coord[0];
      sumLat += coord[1];
    });
    
    return {
      lat: sumLat / ring.length,
      lng: sumLng / ring.length
    };
  };

  // Reverse geocode function
  const reverseGeocode = async (lat, lng) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Forisswell/1.0 (event-location-service)"
        }
      });
      const data = await response.json();
      
      if (data && data.address) {
        const address = data.address;
        return {
          address: `${address.road || ''} ${address.house_number || ''}`.trim() || address.neighbourhood || address.suburb || "Near Forest Area",
          city: address.city || address.town || address.village || address.state || "Local Area",
          fullAddress: data.display_name
        };
      }
      return null;
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
      return null;
    }
  };

  // Generate event description based on risk
  const generateEventDescription = (risk) => {
    let description = `This event is organized in response to a ${risk.riskLevel.toUpperCase()} risk assessment for ${risk.name}.\n\n`;
    description += `Risk Score: ${risk.riskScore}/100\n`;
    description += `Analysis Date: ${new Date(risk.analysisDate).toLocaleDateString()}\n\n`;
    description += `Risk Factors Detected:\n`;
    
    if (risk.factors?.treeCoverLoss > 0) {
      description += `• Tree Cover Loss: ${risk.factors.treeCoverLoss}%\n`;
    }
    if (risk.factors?.fireRisk > 0) {
      description += `• Fire Risk: ${risk.factors.fireRisk}%\n`;
    }
    if (risk.factors?.encroachmentRisk > 0) {
      description += `• Encroachment Risk: ${risk.factors.encroachmentRisk}%\n`;
    }
    if (risk.factors?.degradationRate > 0) {
      description += `• Degradation Rate: ${risk.factors.degradationRate}%\n`;
    }
    if (risk.factors?.illegalLoggingProbability > 0) {
      description += `• Illegal Logging Probability: ${risk.factors.illegalLoggingProbability}%\n`;
    }
    
    description += `\nJoin us to help protect this area and mitigate environmental risks through community action!`;
    
    return description;
  };

  // Get suggested event type based on risk factors
  const getSuggestedEventType = (risk) => {
    const factors = risk.factors || {};
    const maxFactor = Object.entries(factors).reduce((max, [key, value]) => 
      value > max.value ? { key, value } : max, { key: '', value: 0 }
    );
    
    switch(maxFactor.key) {
      case 'treeCoverLoss':
        return 'tree_planting';
      case 'fireRisk':
        return 'workshop';
      case 'encroachmentRisk':
        return 'community_garden';
      case 'degradationRate':
        return 'educational';
      default:
        return 'workshop';
    }
  };

  // Get default start date based on risk level
  const getDefaultStartDate = (risk) => {
    const date = new Date();
    if (risk.riskLevel === 'critical') {
      date.setDate(date.getDate() + 3);
    } else if (risk.riskLevel === 'high') {
      date.setDate(date.getDate() + 7);
    } else {
      date.setDate(date.getDate() + 14);
    }
    date.setHours(10, 0, 0, 0);
    return date.toISOString().slice(0, 16);
  };

  const getDefaultEndDate = (risk) => {
    const startDate = new Date(getDefaultStartDate(risk));
    startDate.setHours(startDate.getHours() + 3);
    return startDate.toISOString().slice(0, 16);
  };

  const getDefaultMaxParticipants = (eventType) => {
    switch(eventType) {
      case 'tree_planting': return 100;
      case 'workshop': return 30;
      case 'community_garden': return 20;
      case 'educational': return 50;
      default: return 50;
    }
  };

  // Handle organize event
  const handleOrganizeEvent = async (risk) => {
    const centroid = getPolygonCentroid(risk.coordinates?.coordinates);
    
    let locationInfo = {
      address: risk.metadata?.region || "Forest Area",
      city: risk.metadata?.country || "Local Region",
      coordinates: centroid || { lat: 0, lng: 0 }
    };
    
    if (centroid) {
      try {
        const geoData = await reverseGeocode(centroid.lat, centroid.lng);
        if (geoData) {
          locationInfo = {
            address: geoData.address,
            city: geoData.city,
            coordinates: centroid
          };
        }
      } catch (err) {
        console.warn("Could not get address from coordinates");
      }
    }
    
    const eventTitle = `Intervention: ${risk.name}`;
    const eventDescription = generateEventDescription(risk);
    const suggestedEventType = getSuggestedEventType(risk);
    
    setOrganizeEventData(risk);
    setEventFormData({
      title: eventTitle,
      description: eventDescription,
      eventType: suggestedEventType,
      startDate: getDefaultStartDate(risk),
      endDate: getDefaultEndDate(risk),
      location: locationInfo,
      maxParticipants: getDefaultMaxParticipants(suggestedEventType),
      tags: [risk.riskLevel, risk.metadata?.region, "risk-response", "intervention"].filter(Boolean),
      reminders: true
    });
    setShowOrganizeEventModal(true);
  };

  // Handle submit event
  const handleSubmitRiskEvent = async (e) => {
    e.preventDefault();
    
    if (!eventFormData.startDate || !eventFormData.endDate) {
      setEventFormError("Please select start and end dates");
      return;
    }
    
    if (new Date(eventFormData.startDate) >= new Date(eventFormData.endDate)) {
      setEventFormError("End date must be after start date");
      return;
    }
    
    setEventFormLoading(true);
    setEventFormError("");
    setEventFormSuccess("");
    
    try {
      const eventPayload = {
        ...eventFormData,
        metadata: {
          relatedRiskId: organizeEventData._id,
          riskLevel: organizeEventData.riskLevel,
          riskScore: organizeEventData.riskScore,
          generatedFromRisk: true
        }
      };
      
      const response = await api.post("/events", eventPayload);
      
      if (response.data.success) {
        setEventFormSuccess("Event created successfully!");
        
        // Link event to risk
        try {
          await api.post(`/risk/${organizeEventData._id}/link-event`, {
            eventId: response.data.data._id
          });
        } catch (linkErr) {
          console.warn("Could not link event to risk:", linkErr);
        }
        
        setTimeout(() => {
          setShowOrganizeEventModal(false);
          fetchRiskAssessments();
          if (selectedRisk?._id === organizeEventData._id) {
            fetchRiskById(organizeEventData._id);
          }
        }, 1500);
      }
    } catch (err) {
      setEventFormError(err.response?.data?.error || "Failed to create event");
    } finally {
      setEventFormLoading(false);
    }
  };

  const handleEventFormChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes(".")) {
      const keys = name.split(".");
      setEventFormData((prev) => {
        const updated = { ...prev };
        let obj = updated;
        for (let i = 0; i < keys.length - 1; i++) {
          obj[keys[i]] = { ...obj[keys[i]] };
          obj = obj[keys[i]];
        }
        obj[keys[keys.length - 1]] = value;
        return updated;
      });
    } else {
      setEventFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAddEventTag = () => {
    if (eventTagInput && !eventFormData.tags.includes(eventTagInput)) {
      setEventFormData(prev => ({ ...prev, tags: [...prev.tags, eventTagInput] }));
      setEventTagInput("");
    }
  };

  const handleRemoveEventTag = (tagToRemove) => {
    setEventFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

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

  const fetchRiskById = async (id) => {
    try {
      const response = await api.get(`/risk/${id}`);
      if (response.data.success) {
        setSelectedRisk(response.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch risk details");
    }
  };

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

  const handleEditRisk = (risk) => {
    setEditingRisk(risk);
    setEditForm({
      name: risk.name,
      riskLevel: risk.riskLevel,
      riskScore: risk.riskScore,
      notes: risk.actions?.[0]?.notes || ""
    });
    setShowEditModal(true);
  };

  const handleUpdateRisk = async () => {
    setActionLoading(true);
    try {
      const response = await api.put(`/risk/update/${editingRisk._id}`, {
        name: editForm.name,
        riskLevel: editForm.riskLevel,
        riskScore: parseInt(editForm.riskScore),
        actions: editForm.notes ? [{
          type: "manual_update",
          status: "pending",
          notes: editForm.notes,
          triggeredAt: new Date()
        }] : []
      });
      
      if (response.data.success) {
        setShowEditModal(false);
        setEditingRisk(null);
        await fetchRiskAssessments();
        await fetchStats();
        if (selectedRisk?._id === editingRisk._id) {
          await fetchRiskById(editingRisk._id);
        }
        setError("");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update risk assessment");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRisk = async (riskId) => {
    setActionLoading(true);
    try {
      const response = await api.delete(`/risk/${riskId}`);
      if (response.data.success) {
        setDeleteConfirm(null);
        if (selectedRisk?._id === riskId) {
          setSelectedRisk(null);
        }
        await fetchRiskAssessments();
        await fetchStats();
        setError("");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete risk assessment");
    } finally {
      setActionLoading(false);
    }
  };

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
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (response.data.success) {
        setAnalysisResult(response.data.data);
        setShowLoadingModal(false);
        setShowAnalysisModal(false);
        await fetchRiskAssessments();
        await fetchStats();
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

  const updateProgress = (step, progressValue) => {
    setAnalysisCurrentStep(step);
    setAnalysisProgress(progressValue);
    
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

  const isPolygonClosed = (coordinates = []) => {
    if (!coordinates || coordinates.length < 2) return false;
    const first = coordinates[0];
    const last = coordinates[coordinates.length - 1];
    return first[0] === last[0] && first[1] === last[1];
  };

  const getOpenCoordinates = (coordinates = []) => (
    isPolygonClosed(coordinates) ? coordinates.slice(0, -1) : coordinates
  );

  const handleMapClick = (e) => {
    if (!analysisForm.drawing) return;
    
    const { lat, lng } = e.latlng;
    setAnalysisForm(prev => ({
      ...prev,
      coordinates: [...getOpenCoordinates(prev.coordinates), [lng, lat]]
    }));
  };

  const completePolygon = () => {
    const openCoordinates = getOpenCoordinates(analysisForm.coordinates);
    if (openCoordinates.length >= 3) {
      const closedCoordinates = [...openCoordinates, openCoordinates[0]];
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

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setLocationLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCurrentLocation([lat, lng]);
        setMapCenter([lat, lng]);
        setMapZoom(15);
        setManualLat(lat.toFixed(6));
        setManualLng(lng.toFixed(6));
        setLocationLoading(false);
      },
      (geoError) => {
        setLocationLoading(false);
        setError(geoError.message || "Unable to detect current location");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleAddManualCoordinate = () => {
    const lat = Number.parseFloat(manualLat);
    const lng = Number.parseFloat(manualLng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError("Please enter valid latitude and longitude values");
      return;
    }

    if (lat < -90 || lat > 90) {
      setError("Latitude must be between -90 and 90");
      return;
    }

    if (lng < -180 || lng > 180) {
      setError("Longitude must be between -180 and 180");
      return;
    }

    setAnalysisForm((prev) => ({
      ...prev,
      coordinates: [...getOpenCoordinates(prev.coordinates), [lng, lat]]
    }));
    setMapCenter([lat, lng]);
    setMapZoom((prev) => Math.max(prev, 13));
    setError("");
  };

  const getRiskConfig = (level) => {
    const config = {
      critical: { color: "text-red-700", bg: "bg-red-50", badge: "error", label: "CRITICAL" },
      high: { color: "text-orange-700", bg: "bg-orange-50", badge: "warning", label: "HIGH" },
      medium: { color: "text-yellow-700", bg: "bg-yellow-50", badge: "warning", label: "MEDIUM" },
      low: { color: "text-green-700", bg: "bg-green-50", badge: "success", label: "LOW" }
    };
    return config[level] || config.low;
  };

  const riskDistributionData = stats?.byLevel?.map(item => ({
    name: item._id.toUpperCase(),
    value: item.count,
    color: COLORS[item._id]
  })) || [];

  // Organize Event Modal Component
  const OrganizeEventModal = () => {
    if (!showOrganizeEventModal) return null;
    
    const eventTypes = [
      { value: "planting", label: "🌱 Planting Event" },
      { value: "workshop", label: "📚 Workshop" },
      { value: "community_garden", label: "🌻 Community Garden" },
      { value: "tree_planting", label: "🌳 Tree Planting" },
      { value: "educational", label: "🎓 Educational" }
    ];
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[70] p-4">
        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <span>🎯</span>
                  Organize Intervention Event
                </h2>
                <p className="text-slate-600 mt-1">
                  Create an event to address risks in {organizeEventData?.name}
                </p>
              </div>
              <button
                onClick={() => setShowOrganizeEventModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className={`p-4 rounded-lg ${
              organizeEventData?.riskLevel === 'critical' ? 'bg-red-50 border border-red-200' :
              organizeEventData?.riskLevel === 'high' ? 'bg-orange-50 border border-orange-200' :
              'bg-yellow-50 border border-yellow-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">Risk Assessment Summary</span>
                <Badge variant={organizeEventData?.riskLevel === 'critical' ? 'error' : 'warning'}>
                  {organizeEventData?.riskLevel?.toUpperCase()} RISK
                </Badge>
              </div>
              <div className="text-sm space-y-1">
                <p><strong>Area:</strong> {organizeEventData?.name}</p>
                <p><strong>Risk Score:</strong> {organizeEventData?.riskScore}/100</p>
                <p><strong>Analysis Date:</strong> {new Date(organizeEventData?.analysisDate).toLocaleDateString()}</p>
              </div>
            </div>
            
            {eventFormError && (
              <FeedbackMessage tone="error" onDismiss={() => setEventFormError("")}>
                {eventFormError}
              </FeedbackMessage>
            )}
            {eventFormSuccess && (
              <FeedbackMessage tone="success" onDismiss={() => setEventFormSuccess("")}>
                {eventFormSuccess}
              </FeedbackMessage>
            )}
            
            <form onSubmit={handleSubmitRiskEvent} className="space-y-4">
              <div>
                <label className="label" htmlFor="event-title">Event Title *</label>
                <input
                  id="event-title"
                  name="title"
                  type="text"
                  required
                  className="input"
                  value={eventFormData.title}
                  onChange={handleEventFormChange}
                  placeholder="Enter event title"
                />
              </div>
              
              <div>
                <label className="label" htmlFor="event-description">Description *</label>
                <textarea
                  id="event-description"
                  name="description"
                  required
                  rows="6"
                  className="input font-mono text-sm"
                  value={eventFormData.description}
                  onChange={handleEventFormChange}
                  placeholder="Describe the event..."
                />
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="event-type">Event Type *</label>
                  <select
                    id="event-type"
                    name="eventType"
                    required
                    className="input"
                    value={eventFormData.eventType}
                    onChange={handleEventFormChange}
                  >
                    {eventTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="max-participants">Max Participants</label>
                  <input
                    id="max-participants"
                    name="maxParticipants"
                    type="number"
                    min="1"
                    className="input"
                    value={eventFormData.maxParticipants}
                    onChange={handleEventFormChange}
                  />
                </div>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="start-date">Start Date & Time *</label>
                  <input
                    id="start-date"
                    name="startDate"
                    type="datetime-local"
                    required
                    className="input"
                    value={eventFormData.startDate}
                    onChange={handleEventFormChange}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="end-date">End Date & Time *</label>
                  <input
                    id="end-date"
                    name="endDate"
                    type="datetime-local"
                    required
                    className="input"
                    value={eventFormData.endDate}
                    onChange={handleEventFormChange}
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900">Location (Near Risk Area)</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="location-address">Address</label>
                    <input
                      id="location-address"
                      name="location.address"
                      type="text"
                      className="input"
                      value={eventFormData.location.address}
                      onChange={handleEventFormChange}
                      placeholder="Street address"
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="location-city">City *</label>
                    <input
                      id="location-city"
                      name="location.city"
                      type="text"
                      required
                      className="input"
                      value={eventFormData.location.city}
                      onChange={handleEventFormChange}
                      placeholder="City"
                    />
                  </div>
                </div>
                {eventFormData.location.coordinates.lat && eventFormData.location.coordinates.lng && (
                  <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                    📍 Coordinates set: {eventFormData.location.coordinates.lat.toFixed(4)}, {eventFormData.location.coordinates.lng.toFixed(4)}
                    <br />
                    <span className="text-gray-500">Location is near the risk assessment area</span>
                  </div>
                )}
              </div>
              
              <div>
                <label className="label" htmlFor="event-tags">Tags</label>
                <div className="flex gap-2">
                  <input
                    id="event-tags"
                    type="text"
                    className="input flex-1"
                    value={eventTagInput}
                    onChange={(e) => setEventTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddEventTag())}
                    placeholder="Add tags (e.g., urgent, reforestation)"
                  />
                  <button type="button" onClick={handleAddEventTag} className="btn-secondary">
                    Add
                  </button>
                </div>
                {eventFormData.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {eventFormData.tags.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded text-sm">
                        #{tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveEventTag(tag)}
                          className="text-slate-500 hover:text-red-500"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex items-center">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={eventFormData.reminders}
                    onChange={(e) => setEventFormData(prev => ({ ...prev, reminders: e.target.checked }))}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700">Send email reminders to participants</span>
                </label>
              </div>
              
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowOrganizeEventModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={eventFormLoading}
                >
                  {eventFormLoading ? "Creating Event..." : "Create Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // Edit Risk Modal Component
  const EditRiskModal = () => {
    if (!showEditModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full">
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">Edit Risk Assessment</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div>
              <label className="label" htmlFor="edit-name">Area Name</label>
              <input
                id="edit-name"
                className="input"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div>
              <label className="label" htmlFor="edit-risk-level">Risk Level</label>
              <select
                id="edit-risk-level"
                className="input"
                value={editForm.riskLevel}
                onChange={(e) => setEditForm(prev => ({ ...prev, riskLevel: e.target.value }))}
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            
            <div>
              <label className="label" htmlFor="edit-risk-score">Risk Score (0-100)</label>
              <input
                id="edit-risk-score"
                type="number"
                min="0"
                max="100"
                className="input"
                value={editForm.riskScore}
                onChange={(e) => setEditForm(prev => ({ ...prev, riskScore: e.target.value }))}
              />
            </div>
            
            <div>
              <label className="label" htmlFor="edit-notes">Notes / Actions</label>
              <textarea
                id="edit-notes"
                rows="3"
                className="input"
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add notes about this risk assessment..."
              />
            </div>
            
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleUpdateRisk}
                disabled={actionLoading}
                className="btn-primary flex-1"
              >
                {actionLoading ? "Updating..." : "Update"}
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Delete Confirmation Modal Component
  const DeleteConfirmModal = () => {
    if (!deleteConfirm) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full">
          <div className="p-6 space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl text-red-600">⚠️</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Risk Assessment</h3>
              <p className="text-slate-600">
                Are you sure you want to delete "{deleteConfirm.name}"? This action cannot be undone.
              </p>
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => handleDeleteRisk(deleteConfirm._id)}
                disabled={actionLoading}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 flex-1 disabled:opacity-50"
              >
                {actionLoading ? "Deleting..." : "Delete"}
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Risk Details Modal Component
  const RiskDetailsModal = () => {
    if (!selectedRisk) return null;
    
    const riskConfig = getRiskConfig(selectedRisk.riskLevel);
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{selectedRisk.name}</h2>
                <div className="mt-1 flex gap-2">
                  <Badge variant={riskConfig.badge}>
                    {selectedRisk.riskLevel.toUpperCase()} RISK
                  </Badge>
                  <Badge variant="secondary">
                    Score: {selectedRisk.riskScore}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2">
                {/* Organize Event - Available to all logged-in users */}
                {isLoggedIn && (
                  <button
                    onClick={() => {
                      setSelectedRisk(null);
                      handleOrganizeEvent(selectedRisk);
                    }}
                    className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition flex items-center gap-1"
                  >
                    <span>🎯</span> Organize Event
                  </button>
                )}
                
                {/* Edit and Delete - Admin only */}
                {isAdmin && (
                  <>
                    <button
                      onClick={() => {
                        setSelectedRisk(null);
                        handleEditRisk(selectedRisk);
                      }}
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRisk(null);
                        setDeleteConfirm(selectedRisk);
                      }}
                      className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition"
                    >
                      Delete
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedRisk(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Risk Factors</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Tree Cover Loss</span>
                      <span className="font-medium">{selectedRisk.factors?.treeCoverLoss || 0}%</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${selectedRisk.factors?.treeCoverLoss || 0}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Degradation Rate</span>
                      <span className="font-medium">{selectedRisk.factors?.degradationRate || 0}%</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${selectedRisk.factors?.degradationRate || 0}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Fire Risk</span>
                      <span className="font-medium">{selectedRisk.factors?.fireRisk || 0}%</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500 rounded-full transition-all" style={{ width: `${selectedRisk.factors?.fireRisk || 0}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Encroachment Risk</span>
                      <span className="font-medium">{selectedRisk.factors?.encroachmentRisk || 0}%</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${selectedRisk.factors?.encroachmentRisk || 0}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Illegal Logging Probability</span>
                      <span className="font-medium">{selectedRisk.factors?.illegalLoggingProbability || 0}%</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${selectedRisk.factors?.illegalLoggingProbability || 0}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Satellite Data</h3>
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-600">Tree Cover Percentage</span>
                    <span className="font-medium">{selectedRisk.satelliteData?.treeCoverPercentage || 0}%</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-600">Change Detected</span>
                    <span className="font-medium">{selectedRisk.satelliteData?.changeDetected ? "Yes" : "No"}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-600">Confidence</span>
                    <span className="font-medium">{selectedRisk.satelliteData?.confidence || 0}%</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-600">Data Source</span>
                    <span className="font-medium">{selectedRisk.satelliteData?.source || "Unknown"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Imagery Date</span>
                    <span className="font-medium">
                      {selectedRisk.satelliteData?.imageryDate 
                        ? new Date(selectedRisk.satelliteData.imageryDate).toLocaleDateString() 
                        : "Unknown"}
                    </span>
                  </div>
                </div>

                {selectedRisk.satelliteData?.historicalComparison && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-slate-900 mb-2">Historical Comparison</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 rounded-lg p-3 text-center">
                        <div className="text-sm text-slate-600">5-Year Change</div>
                        <div className={`text-lg font-bold ${selectedRisk.satelliteData.historicalComparison.fiveYearChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {selectedRisk.satelliteData.historicalComparison.fiveYearChange > 0 ? '+' : ''}
                          {selectedRisk.satelliteData.historicalComparison.fiveYearChange}%
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3 text-center">
                        <div className="text-sm text-slate-600">10-Year Change</div>
                        <div className={`text-lg font-bold ${selectedRisk.satelliteData.historicalComparison.tenYearChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {selectedRisk.satelliteData.historicalComparison.tenYearChange > 0 ? '+' : ''}
                          {selectedRisk.satelliteData.historicalComparison.tenYearChange}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
                <div className="flex justify-between">
                  <span>Region:</span>
                  <span className="font-medium">{selectedRisk.metadata?.region || "Unknown"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Analyzed:</span>
                  <span className="font-medium">{new Date(selectedRisk.analysisDate).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Updated:</span>
                  <span className="font-medium">{new Date(selectedRisk.updatedAt).toLocaleString()}</span>
                </div>
                {selectedRisk.metadata?.tags?.length > 0 && (
                  <div className="flex justify-between">
                    <span>Tags:</span>
                    <div className="flex gap-1 flex-wrap">
                      {selectedRisk.metadata.tags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary" size="sm">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
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
    );
  };

  return (
    <div className="space-y-6">
      {showLoadingModal && (
        <AnalysisLoadingModal 
          progress={analysisProgress}
          currentStep={analysisCurrentStep}
          stepStatus={analysisStepStatus}
        />
      )}

      <EditRiskModal />
      <DeleteConfirmModal />
      <RiskDetailsModal />
      <OrganizeEventModal />

      <Card className="border-green-100 bg-gradient-to-r from-green-50 to-emerald-50">
        <SectionHeader
          title="Forest Risk Analysis Dashboard"
          subtitle="Monitor deforestation, fire risk, and encroachment in forest areas"
          right={
            isLoggedIn && (
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
            )
          }
        />
      </Card>

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
                className={`cursor-pointer transition hover:-translate-y-0.5 hover:shadow-card border-l-4 relative ${
                  risk.riskLevel === "critical" ? "border-l-red-500" :
                  risk.riskLevel === "high" ? "border-l-orange-500" :
                  risk.riskLevel === "medium" ? "border-l-yellow-500" :
                  "border-l-green-500"
                }`}
                onClick={() => setSelectedRisk(risk)}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-slate-900 truncate pr-2">{risk.name}</h3>
                      <div className="mt-1">
                        <Badge variant={riskConfig.badge}>{riskConfig.label}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold shrink-0" style={{ color: COLORS[risk.riskLevel] }}>
                        {risk.riskScore}
                      </div>
                      
                      {/* Show organize event button for all logged-in users */}
                      {isLoggedIn && (
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOrganizeEvent(risk);
                            }}
                            className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition"
                            title="Organize Event"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </button>
                          
                          {/* Edit and Delete - Admin only */}
                          {isAdmin && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditRisk(risk);
                                }}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                title="Edit"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirm(risk);
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                                title="Delete"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      )}
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
            if (isLoggedIn) {
              setShowAnalysisModal(true);
              setAnalysisResult(null);
              clearPolygon();
            }
          }}
        />
      )}

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
                        <MapViewportController center={mapCenter} zoom={mapZoom} />
                        <DrawingInstructions drawing={analysisForm.drawing} />
                        <DrawingPoints points={analysisForm.coordinates} />
                        <CurrentLocationMarker location={currentLocation} />
                        {analysisForm.coordinates.length > 0 && (
                          <Polygon
                            positions={analysisForm.coordinates.map(coord => [coord[1], coord[0]])}
                            pathOptions={{ color: "#22c55e", weight: 3, fillColor: "#22c55e", fillOpacity: 0.2 }}
                          />
                        )}
                      </MapContainer>
                    </div>

                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={useCurrentLocation}
                          disabled={locationLoading}
                          className="btn-secondary"
                        >
                          {locationLoading ? "Detecting..." : "Use Current Location"}
                        </button>
                        <span className="text-xs text-slate-500">
                          Jump map to your current location for faster point selection.
                        </span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <input
                          type="number"
                          step="any"
                          className="input"
                          placeholder="Latitude (e.g., 6.9271)"
                          value={manualLat}
                          onChange={(e) => setManualLat(e.target.value)}
                        />
                        <input
                          type="number"
                          step="any"
                          className="input"
                          placeholder="Longitude (e.g., 79.8612)"
                          value={manualLng}
                          onChange={(e) => setManualLng(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={handleAddManualCoordinate}
                          className="btn-primary"
                        >
                          Add Coordinate Point
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {!analysisForm.drawing && analysisForm.coordinates.length === 0 && (
                        <button type="button" onClick={startDrawing} className="btn-primary">
                          ✏️ Start Drawing
                        </button>
                      )}
                      {analysisForm.drawing && (
                        <>
                          <button type="button" onClick={() => setAnalysisForm(prev => ({ ...prev, drawing: false }))} className="btn-secondary">
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
                          <button type="button" onClick={startDrawing} className="btn-secondary">
                            ✏️ Continue Drawing
                          </button>
                          <button type="button" onClick={clearPolygon} className="btn-secondary text-red-600 hover:text-red-700">
                            🗑️ Clear Polygon
                          </button>
                        </>
                      )}
                    </div>
                    
                    {analysisForm.coordinates.length > 0 && (
                      <div className="mt-2 p-3 bg-slate-50 rounded-lg">
                        <div className="text-sm font-medium text-slate-700 mb-1">
                          Polygon Points: {getOpenCoordinates(analysisForm.coordinates).length} points
                        </div>
                        <div className="text-xs text-slate-500">
                          {getOpenCoordinates(analysisForm.coordinates).length >= 3 ? 
                            "✓ Ready for analysis" : 
                            `Need ${3 - getOpenCoordinates(analysisForm.coordinates).length} more point(s) to create a valid polygon`}
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
    </div>
  );
};

export default RiskAnalysisPage;
