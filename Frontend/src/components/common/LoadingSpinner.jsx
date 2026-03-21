import { cx } from "../../utils/cx";

function LoadingSpinner({ label = "Loading...", center = true, className }) {
  return (
    <div
      className={cx(
        "flex items-center gap-3 text-slate-600",
        center ? "justify-center py-8" : "",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-leaf-600" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export default LoadingSpinner;
