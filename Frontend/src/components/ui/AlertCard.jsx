import Badge from "./Badge";

const priorityTone = {
  critical: "danger",
  high: "warning",
  medium: "info",
  low: "leaf",
};

const statusTone = {
  pending: "warning",
  assigned: "info",
  in_progress: "leaf",
  completed: "success",
  cancelled: "neutral",
  expired: "danger",
};

const alertTypeIcons = {
  high_temperature: "🌡️",
  heavy_rain: "🌧️",
  strong_wind: "💨",
  multiple_threats: "⚠️",
};

/**
 * AlertCard component - Displays alert with weather data and actions
 */
function AlertCard({ alert, onAccept, onStart, onComplete, onCancel, isLoading }) {
  const typeIcon = alertTypeIcons[alert.type] || "🔔";
  const treeName = alert.tree?.name || alert.tree?.species || "Unknown Tree";

  const getActionLabel = (action) => {
    const labels = {
      water_tree: "💧 Water Tree",
      provide_shade: "🌳 Provide Shade",
      check_stability: "🔍 Check Stability",
      remove_standing_water: "🌊 Remove Water",
      secure_branches: "🔐 Secure Branches",
      inspect_damage: "🔎 Inspect Damage",
    };
    return labels[action] || action.replace(/_/g, " ");
  };

  const getViolationColor = (violation) => {
    if (violation.excessAmount > 10) return "text-red-600";
    if (violation.excessAmount > 5) return "text-orange-600";
    return "text-yellow-600";
  };

  const formatViolationType = (type) => {
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{typeIcon}</span>
            <h2 className="text-lg font-semibold text-slate-900">
              {formatViolationType(alert.type)}
            </h2>
          </div>
          <p className="text-sm text-slate-600 line-clamp-2">{alert.description}</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <Badge variant={priorityTone[alert.priority] || "neutral"}>
            {alert.priority?.toUpperCase()}
          </Badge>
          <Badge variant={statusTone[alert.status] || "neutral"}>
            {alert.status?.replace(/_/g, " ")}
          </Badge>
        </div>
      </div>

      {/* Tree Info */}
      <div className="mb-4 pb-4 border-b border-slate-100">
        <p className="text-sm">
          <span className="font-semibold text-slate-700">🌳 Tree:</span>{" "}
          <span className="text-slate-600">{treeName}</span>
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Created: {new Date(alert.createdAt).toLocaleString()}
        </p>
      </div>

      {/* Weather Data */}
      {alert.weatherData && (
        <div className="mb-4 pb-4 border-b border-slate-100">
          <p className="font-semibold text-slate-800 text-sm mb-3">🌤️ Current Weather</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-xs font-medium text-blue-700">Temperature</p>
              <p className="text-lg font-bold text-blue-900">
                {alert.weatherData.temperature?.toFixed(1)}°C
              </p>
            </div>
            <div className="rounded-lg bg-cyan-50 p-3">
              <p className="text-xs font-medium text-cyan-700">Humidity</p>
              <p className="text-lg font-bold text-cyan-900">
                {alert.weatherData.humidity || "N/A"}%
              </p>
            </div>
            <div className="rounded-lg bg-blue-100 p-3">
              <p className="text-xs font-medium text-blue-700">Rainfall</p>
              <p className="text-lg font-bold text-blue-900">
                {alert.weatherData.rainfall?.toFixed(1)}mm/h
              </p>
            </div>
            <div className="rounded-lg bg-slate-100 p-3">
              <p className="text-xs font-medium text-slate-700">Wind Speed</p>
              <p className="text-lg font-bold text-slate-900">
                {(alert.weatherData.windSpeed * 3.6)?.toFixed(1)}km/h
              </p>
            </div>
          </div>
          {alert.weatherData.conditions && (
            <p className="text-xs text-slate-500 mt-3">
              Conditions: <span className="capitalize">{alert.weatherData.conditions}</span>
            </p>
          )}
        </div>
      )}

      {/* Threshold Violations */}
      {alert.thresholdViolations && alert.thresholdViolations.length > 0 && (
        <div className="mb-4 pb-4 border-b border-slate-100">
          <p className="font-semibold text-slate-800 text-sm mb-3">⚠️ Threshold Violations</p>
          <div className="space-y-2">
            {alert.thresholdViolations.map((violation, idx) => (
              <div key={idx} className="rounded-lg bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">
                    {formatViolationType(violation.type)}
                  </p>
                  <span className={`font-bold ${getViolationColor(violation)}`}>
                    +{violation.excessAmount?.toFixed(1)} {violation.type.includes("_temperature") ? "°C" : violation.type.includes("_rain") ? "mm" : "km/h"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Actual: {violation.actualValue?.toFixed(1)} | Threshold: {violation.threshold}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions Required */}
      {alert.actionRequired && alert.actionRequired.length > 0 && (
        <div className="mb-4 pb-4 border-b border-slate-100">
          <p className="font-semibold text-slate-800 text-sm mb-3">✅ Actions Required</p>
          <div className="flex flex-wrap gap-2">
            {alert.actionRequired.map((action, idx) => (
              <span key={idx} className="inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                {getActionLabel(action)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 justify-end">
        {alert.status === "pending" && (
          <button
            onClick={onAccept}
            disabled={isLoading}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? "Accepting..." : "Accept Alert"}
          </button>
        )}
        {alert.status === "assigned" && (
          <button
            onClick={onStart}
            disabled={isLoading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? "Starting..." : "Start Work"}
          </button>
        )}
        {alert.status === "in_progress" && (
          <button
            onClick={onComplete}
            disabled={isLoading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {isLoading ? "Completing..." : "Complete"}
          </button>
        )}
        {(alert.status === "assigned" || alert.status === "in_progress") && (
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export default AlertCard;
