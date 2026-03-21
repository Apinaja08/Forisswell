import { cx } from "../../utils/cx";

const variantStyles = {
  neutral: "border-slate-200 bg-slate-100 text-slate-700",
  success: "border-green-200 bg-green-100 text-green-700",
  info: "border-blue-200 bg-blue-100 text-blue-700",
  warning: "border-amber-200 bg-amber-100 text-amber-700",
  danger: "border-red-200 bg-red-100 text-red-700",
  leaf: "border-leaf-200 bg-leaf-100 text-leaf-700",
};

function Badge({ children, variant = "neutral", className }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide",
        variantStyles[variant] || variantStyles.neutral,
        className
      )}
    >
      {children}
    </span>
  );
}

export default Badge;
