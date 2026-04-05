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

const priorityColors = {
  critical: { bg: "from-red-50 to-red-100", border: "border-red-300", text: "text-red-700", badge: "bg-red-600" },
  high: { bg: "from-orange-50 to-orange-100", border: "border-orange-300", text: "text-orange-700", badge: "bg-orange-600" },
  medium: { bg: "from-blue-50 to-blue-100", border: "border-blue-300", text: "text-blue-700", badge: "bg-blue-600" },
  low: { bg: "from-green-50 to-green-100", border: "border-green-300", text: "text-green-700", badge: "bg-green-600" },
};

/**
 * AlertCard component - Displays alert with weather data and actions
 */
function AlertCard({ alert, onAccept, onStart, onComplete, onCancel, isLoading }) {
  const typeIcon = alertTypeIcons[alert.type] || "🔔";
  const treeName = alert.tree?.name || alert.tree?.species || "Unknown Tree";
  const colors = priorityColors[alert.priority] || priorityColors.low;

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
    if (violation.excessAmount > 10) return "from-red-50 to-red-100 text-red-700";
    if (violation.excessAmount > 5) return "from-orange-50 to-orange-100 text-orange-700";
    return "from-yellow-50 to-yellow-100 text-yellow-700";
  };

  const formatViolationType = (type) => {
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className={`group relative overflow-hidden rounded-2xl border-2 ${colors.border} bg-gradient-to-br ${colors.bg} shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1`}>
      {/* Decorative corner element */}
      <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white opacity-5 group-hover:opacity-10 transition-opacity" />
      
      <div className="relative p-5 space-y-3">
        {/* Header with priority indicator */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="text-2xl">{typeIcon}</div>
              <div>
                <h2 className={`text-lg font-bold ${colors.text}`}>
                  {formatViolationType(alert.type)}
                </h2>
                <div className="h-1 w-8 bg-gradient-to-r from-current to-transparent opacity-40"></div>
              </div>
            </div>
            <p className="text-xs text-slate-600 line-clamp-1">{alert.description}</p>
          </div>
          <div className="flex gap-1.5 flex-wrap justify-end">
            <Badge variant={priorityTone[alert.priority] || "neutral"} className="text-xs font-bold">
              {alert.priority?.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Tree Info */}
        <div className="rounded-lg bg-white/50 backdrop-blur-sm p-2.5 border border-white/30">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌳</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-700">Tree</p>
              <p className="text-sm font-bold text-slate-900 truncate">{treeName}</p>
            </div>
            <div className="text-xs text-slate-500">
              {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* Weather Data */}
        {alert.weatherData && (
          <div className="rounded-lg bg-white/40 p-2.5">
            <p className="text-xs font-bold text-slate-700 mb-2">🌤️ Weather</p>
            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-lg bg-blue-500/10 backdrop-blur p-1.5 text-center">
                <p className="text-xs font-medium text-blue-700">Temp</p>
                <p className="text-sm font-bold text-blue-900">
                  {alert.weatherData.temperature?.toFixed(0)}°
                </p>
              </div>
              <div className="rounded-lg bg-cyan-500/10 backdrop-blur p-1.5 text-center">
                <p className="text-xs font-medium text-cyan-700">Humidity</p>
                <p className="text-sm font-bold text-cyan-900">
                  {alert.weatherData.humidity || "N/A"}%
                </p>
              </div>
              <div className="rounded-lg bg-blue-500/10 backdrop-blur p-1.5 text-center">
                <p className="text-xs font-medium text-blue-700">Rain</p>
                <p className="text-sm font-bold text-blue-900">
                  {alert.weatherData.rainfall?.toFixed(1)}m
                </p>
              </div>
              <div className="rounded-lg bg-slate-500/10 backdrop-blur p-1.5 text-center">
                <p className="text-xs font-medium text-slate-700">Wind</p>
                <p className="text-sm font-bold text-slate-900">
                  {(alert.weatherData.windSpeed * 3.6)?.toFixed(0)}km
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Threshold Violations */}
        {alert.thresholdViolations && alert.thresholdViolations.length > 0 && (
          <div className="rounded-lg bg-white/40 p-2.5">
            <p className="text-xs font-bold text-slate-700 mb-2">⚠️ Violations</p>
            <div className="space-y-1.5">
              {alert.thresholdViolations.map((violation, idx) => (
                <div key={idx} className={`rounded-lg bg-gradient-to-r ${getViolationColor(violation)} p-2 text-xs`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{formatViolationType(violation.type)}</span>
                    <span className="font-bold">+{violation.excessAmount?.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions Required */}
        {alert.actionRequired && alert.actionRequired.length > 0 && (
          <div className="rounded-lg bg-green-500/10 p-2.5">
            <p className="text-xs font-bold text-green-700 mb-1.5">✅ Actions</p>
            <div className="flex flex-wrap gap-1">
              {alert.actionRequired.map((action, idx) => (
                <span key={idx} className="inline-block rounded-full bg-green-200/60 backdrop-blur px-2 py-0.5 text-xs font-semibold text-green-800">
                  {getActionLabel(action)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end pt-1 border-t border-white/20">
          {alert.status === "pending" && (
            <button
              onClick={onAccept}
              disabled={isLoading}
              className="rounded-lg bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-xs font-bold transition-all duration-200 hover:shadow-lg disabled:opacity-50 transform hover:scale-105"
            >
              {isLoading ? "⏳" : "✓ Accept"}
            </button>
          )}
          {alert.status === "assigned" && (
            <>
              <button
                onClick={onStart}
                disabled={isLoading}
                className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-bold transition-all duration-200 hover:shadow-lg disabled:opacity-50 transform hover:scale-105"
              >
                {isLoading ? "⏳" : "▶ Start"}
              </button>
              <button
                onClick={onCancel}
                disabled={isLoading}
                className="rounded-lg bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 text-xs font-bold transition-all duration-200 disabled:opacity-50"
              >
                ✕
              </button>
            </>
          )}
          {alert.status === "in_progress" && (
            <>
              <button
                onClick={onComplete}
                disabled={isLoading}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold transition-all duration-200 hover:shadow-lg disabled:opacity-50 transform hover:scale-105"
              >
                {isLoading ? "⏳" : "✓ Complete"}
              </button>
              <button
                onClick={onCancel}
                disabled={isLoading}
                className="rounded-lg bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 text-xs font-bold transition-all duration-200 disabled:opacity-50"
              >
                ✕
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AlertCard;
