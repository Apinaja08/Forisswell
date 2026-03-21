import { cx } from "../../utils/cx";

const toneStyles = {
  error: "border-red-200 bg-red-50 text-red-700",
  success: "border-green-200 bg-green-50 text-green-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
};

function FeedbackMessage({ tone = "info", children, className }) {
  return (
    <div
      className={cx(
        "rounded-xl border px-4 py-3 text-sm font-medium",
        toneStyles[tone] || toneStyles.info,
        className
      )}
      role="status"
    >
      {children}
    </div>
  );
}

export default FeedbackMessage;
