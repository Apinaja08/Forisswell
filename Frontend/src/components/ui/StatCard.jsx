import { cx } from "../../utils/cx";
import Badge from "./Badge";

function StatCard({ title, value, helper, tone = "leaf", className }) {
  return (
    <article className={cx("surface-card-muted", className)}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-600">{title}</p>
        <Badge variant={tone}>Live</Badge>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </article>
  );
}

export default StatCard;
