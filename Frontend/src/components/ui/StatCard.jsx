import { cx } from "../../utils/cx";
import Badge from "./Badge";

const toneColors = {
  leaf: "from-leaf-50 to-leaf-100 border-leaf-200",
  warning: "from-amber-50 to-amber-100 border-amber-200",
  success: "from-green-50 to-green-100 border-green-200",
  info: "from-blue-50 to-blue-100 border-blue-200",
  danger: "from-red-50 to-red-100 border-red-200",
};

const iconColors = {
  leaf: "text-leaf-600",
  warning: "text-amber-600",
  success: "text-green-600",
  info: "text-blue-600",
  danger: "text-red-600",
};

function StatCard({ title, value, helper, tone = "leaf", className, icon: Icon }) {
  return (
    <article
      className={cx(
        "group relative overflow-hidden rounded-2xl border-2 bg-gradient-to-br p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
        toneColors[tone] || toneColors.leaf,
        className
      )}
    >
      {/* Background decoration */}
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-20" 
           style={{backgroundColor: tone === 'leaf' ? '#10b981' : tone === 'warning' ? '#f59e0b' : tone === 'success' ? '#10b981' : tone === 'info' ? '#3b82f6' : '#ef4444'}} />
      
      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">{title}</p>
          <Badge variant={tone}>Live</Badge>
        </div>
        
        <div className="flex items-end justify-between">
          <div>
            <p className="text-4xl font-bold text-slate-900">{value}</p>
            {helper && <p className="mt-2 text-xs text-slate-600">{helper}</p>}
          </div>
          {Icon && (
            <div className={`text-3xl opacity-40 group-hover:opacity-60 transition-opacity ${iconColors[tone] || iconColors.leaf}`}>
              <Icon />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default StatCard;
